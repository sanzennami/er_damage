<#
.SYNOPSIS
    一键把本地改动通过电脑上的网络代理 push 到 GitHub。

.DESCRIPTION
    流程：探测可用代理 -> git add -A -> git commit -> git push。
    代理只对本次 git 调用生效（用 `git -c http.proxy=...`），不会写进
    全局 / 仓库的 git config，代理关掉之后也不会残留导致 git 连不上网。

    代理来源按优先级：
      1. -Proxy 参数
      2. 环境变量 ER_PUSH_PROXY / HTTPS_PROXY / HTTP_PROXY
      3. Windows 系统代理设置（注册表 Internet Settings）
      4. 常见本地代理端口扫描（Clash / v2rayN / Shadowsocks 等）
      5. 直连（不走代理）
    每个候选都会用 `git ls-remote` 真实连一次 GitHub，第一个连通的胜出。

.EXAMPLE
    .\scripts\push.ps1
    .\scripts\push.ps1 -Message "修复技能伤害表"
    .\scripts\push.ps1 -Proxy http://127.0.0.1:7897 -Branch master
    .\scripts\push.ps1 -DryRun
#>

[CmdletBinding()]
param(
    # 提交信息。不给就用 "update: 时间戳"。
    [Alias('m')]
    [string]$Message,

    # 强制指定代理，例如 http://127.0.0.1:7897 或 socks5h://127.0.0.1:7897
    [string]$Proxy,

    # 远程名，默认 origin
    [string]$Remote = 'origin',

    # 目标分支，默认当前分支
    [string]$Branch,

    # 只 push 已有的提交，不执行 git add / git commit
    [switch]$NoCommit,

    # 只探测代理并打印将要执行的操作，不实际提交和推送
    [switch]$DryRun,

    # 跳过代理探测，直接连
    [switch]$NoProxy
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

# git 传输超时：10 秒内速度低于 1KB/s 就放弃。
# 注意这只管"连上之后传得太慢"，管不了"TCP 连接阶段卡死"——后者由
# Invoke-GitWithTimeout 的进程级硬超时兜底。
$timeoutArgs = @('-c', 'http.lowSpeedLimit=1000', '-c', 'http.lowSpeedTime=10')

# 探测单个通道最多等多久（毫秒）
$probeTimeoutMs = 15000

function Write-Step   { param([string]$Text) Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok     { param([string]$Text) Write-Host "    $Text" -ForegroundColor Green }
function Write-Warn   { param([string]$Text) Write-Host "    $Text" -ForegroundColor Yellow }
function Write-Fail   { param([string]$Text) Write-Host "    $Text" -ForegroundColor Red }

function Test-Port {
    param([string]$ProxyHost, [int]$Port, [int]$TimeoutMs = 400)
    $client = New-Object System.Net.Sockets.TcpClient
    try {
        $async = $client.BeginConnect($ProxyHost, $Port, $null, $null)
        if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) { return $false }
        $client.EndConnect($async)
        return $true
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function ConvertTo-ProxyUrl {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $v = $Value.Trim()
    # 系统代理可能是 "http=127.0.0.1:7897;https=127.0.0.1:7897" 这种格式
    if ($v -match '(?:^|;)\s*https?=([^;]+)') { $v = $Matches[1].Trim() }
    elseif ($v -match ';') { $v = ($v -split ';')[0].Trim() }
    if ($v -notmatch '^[a-zA-Z0-9]+://') { $v = "http://$v" }
    return $v
}

function Get-ProxyEndpoint {
    param([string]$Url)
    try {
        $uri = [System.Uri]$Url
        return [pscustomobject]@{ Host = $uri.Host; Port = $uri.Port }
    } catch {
        return $null
    }
}

# ---------------------------------------------------------------- 代理候选

function Get-ProxyCandidates {
    $candidates = New-Object System.Collections.Generic.List[object]
    $seen = New-Object System.Collections.Generic.HashSet[string]

    function Add-Candidate {
        param([string]$Url, [string]$Source)
        $normalized = ConvertTo-ProxyUrl $Url
        if (-not $normalized) { return }
        if (-not $seen.Add($normalized.ToLowerInvariant())) { return }
        $candidates.Add([pscustomobject]@{ Url = $normalized; Source = $Source })
    }

    if ($Proxy) { Add-Candidate $Proxy '命令行参数' }

    foreach ($name in @('ER_PUSH_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY')) {
        $value = [Environment]::GetEnvironmentVariable($name)
        if ($value) { Add-Candidate $value "环境变量 $name" }
    }

    try {
        $ie = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction Stop
        if ($ie.ProxyServer) {
            $state = '关'
            if ($ie.ProxyEnable -eq 1) { $state = '开' }
            Add-Candidate $ie.ProxyServer "系统代理设置（开关：$state）"
        }
    } catch {
        # 读不到就算了
    }

    # 常见本地代理端口：Clash Verge / Clash for Windows / v2rayN / SSR / Mihomo 等
    foreach ($port in @(7897, 7890, 7891, 10809, 10808, 1080, 1081, 8889, 8118, 20171, 33210)) {
        Add-Candidate "http://127.0.0.1:$port" "常见端口 $port"
    }

    return $candidates
}

function Stop-ProcessTree {
    param([int]$ProcessId)
    # git 会派生 git-remote-https，必须连子进程一起杀，否则残留进程继续挂着
    & taskkill /PID $ProcessId /T /F 2>&1 | Out-Null
}

# 带硬超时地跑 git：git 在 TCP 连接阶段卡住时不认任何 http.* 超时配置，
# 只能从外面掐掉进程。
function Invoke-GitWithTimeout {
    param([string[]]$GitArgs, [int]$TimeoutMs)

    $quoted = $GitArgs | ForEach-Object {
        if ($_ -match '\s') { '"' + $_ + '"' } else { $_ }
    }

    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName               = 'git'
    $psi.Arguments              = ($quoted -join ' ')
    $psi.WorkingDirectory       = $repoRoot
    $psi.UseShellExecute        = $false
    $psi.CreateNoWindow         = $true
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError  = $true
    # 探测阶段绝不能弹凭据窗口，否则会一直等用户输入
    $psi.EnvironmentVariables['GIT_TERMINAL_PROMPT'] = '0'
    $psi.EnvironmentVariables['GCM_INTERACTIVE']     = 'Never'

    $proc = [System.Diagnostics.Process]::Start($psi)
    # 先挂上异步读取，避免管道缓冲写满导致死锁
    $null = $proc.StandardOutput.ReadToEndAsync()
    $null = $proc.StandardError.ReadToEndAsync()

    if (-not $proc.WaitForExit($TimeoutMs)) {
        Stop-ProcessTree $proc.Id
        try { $proc.WaitForExit(2000) | Out-Null } catch { }
        return $false
    }
    return ($proc.ExitCode -eq 0)
}

# 从远程 URL 里取出主机名，用于直连可达性预检
function Get-RemoteHost {
    $url = (& git remote get-url $Remote 2>$null)
    if (-not $url) { return $null }
    $url = $url.Trim()
    if ($url -match '^[a-zA-Z][a-zA-Z0-9+.-]*://') {
        try { return ([System.Uri]$url).Host } catch { return $null }
    }
    # scp 风格：git@github.com:user/repo.git
    if ($url -match '^[^@]+@([^:]+):') { return $Matches[1] }
    return $null
}

function Test-GitRemote {
    param([string]$ProxyUrl)
    $gitArgs = @()
    if ($ProxyUrl) {
        $gitArgs += @('-c', "http.proxy=$ProxyUrl", '-c', "https.proxy=$ProxyUrl")
    } else {
        # 显式清空，免得受已有 config 影响
        $gitArgs += @('-c', 'http.proxy=', '-c', 'https.proxy=')
    }
    $gitArgs += $timeoutArgs
    $gitArgs += @('ls-remote', '--heads', $Remote, 'HEAD')

    return (Invoke-GitWithTimeout -GitArgs $gitArgs -TimeoutMs $probeTimeoutMs)
}

function Resolve-WorkingProxy {
    if ($NoProxy) {
        Write-Step '跳过代理探测（-NoProxy）'
        return @{ Url = $null; Source = '直连' }
    }

    Write-Step "探测能连上 GitHub 的通道（远程：$Remote）"
    foreach ($candidate in Get-ProxyCandidates) {
        $endpoint = Get-ProxyEndpoint $candidate.Url
        if ($endpoint -and -not (Test-Port -ProxyHost $endpoint.Host -Port $endpoint.Port)) {
            Write-Verbose "端口未监听，跳过：$($candidate.Url)"
            continue
        }
        Write-Host "    尝试 $($candidate.Url)  [$($candidate.Source)] ..." -NoNewline
        if (Test-GitRemote $candidate.Url) {
            Write-Host ' 通' -ForegroundColor Green
            return @{ Url = $candidate.Url; Source = $candidate.Source }
        }
        Write-Host ' 不通' -ForegroundColor DarkGray
    }

    Write-Host '    尝试 直连 ...' -NoNewline
    # 先用 3 秒 TCP 探一下远程主机，被墙的情况下能快速判死，不用等满超时
    $remoteHost = Get-RemoteHost
    if ($remoteHost -and -not (Test-Port -ProxyHost $remoteHost -Port 443 -TimeoutMs 3000)) {
        Write-Host " 不通（连不上 $remoteHost:443）" -ForegroundColor DarkGray
        return $null
    }
    if (Test-GitRemote $null) {
        Write-Host ' 通' -ForegroundColor Green
        return @{ Url = $null; Source = '直连' }
    }
    Write-Host ' 不通' -ForegroundColor DarkGray
    return $null
}

# ---------------------------------------------------------------- 主流程

if (-not (Test-Path (Join-Path $repoRoot '.git'))) {
    Write-Fail "$repoRoot 不是 git 仓库。"
    exit 1
}

if (-not $Branch) {
    $Branch = (& git rev-parse --abbrev-ref HEAD).Trim()
}
if (-not $Branch -or $Branch -eq 'HEAD') {
    Write-Fail '当前处于游离 HEAD 状态，请先 checkout 到一个分支。'
    exit 1
}

Write-Step "仓库 $repoRoot"
Write-Ok   "分支 $Branch  ->  $Remote"

$status = & git status --porcelain
$hasChanges = -not [string]::IsNullOrWhiteSpace(($status -join ''))

if ($hasChanges) {
    $changeCount = ($status | Where-Object { $_ }).Count
    Write-Ok "工作区有 $changeCount 处改动"
} else {
    Write-Ok '工作区干净'
}

$resolved = Resolve-WorkingProxy
if (-not $resolved) {
    Write-Fail '所有通道都连不上 GitHub。请确认代理软件已开启，或用 -Proxy 手动指定，例如：'
    Write-Fail '  .\scripts\push.ps1 -Proxy http://127.0.0.1:7897'
    exit 1
}

$proxyUrl = $resolved.Url
if ($proxyUrl) {
    Write-Ok "使用代理 $proxyUrl（来源：$($resolved.Source)）"
} else {
    Write-Ok '不使用代理，直连可用'
}

# 组装本次 push 用的 git 前缀参数
$gitPrefix = @()
if ($proxyUrl) {
    $gitPrefix += @('-c', "http.proxy=$proxyUrl", '-c', "https.proxy=$proxyUrl")
} else {
    $gitPrefix += @('-c', 'http.proxy=', '-c', 'https.proxy=')
}
$gitPrefix += $timeoutArgs

if (-not $Message) {
    $Message = "update: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

if ($DryRun) {
    Write-Step '预演模式（-DryRun），不会真的提交或推送'
    if ($hasChanges -and -not $NoCommit) {
        Write-Ok "将执行: git add -A"
        Write-Ok "将执行: git commit -m `"$Message`""
    }
    Write-Ok "将执行: git $($gitPrefix -join ' ') push -u $Remote $Branch"
    exit 0
}

if ($NoCommit) {
    Write-Step '跳过提交（-NoCommit）'
} elseif ($hasChanges) {
    Write-Step '暂存并提交改动'
    & git add -A
    if ($LASTEXITCODE -ne 0) { Write-Fail 'git add 失败'; exit 1 }

    & git commit -m $Message
    if ($LASTEXITCODE -ne 0) { Write-Fail 'git commit 失败'; exit 1 }
    Write-Ok "已提交：$Message"
} else {
    Write-Step '没有新改动，直接推送已有提交'
}

Write-Step "推送到 $Remote/$Branch"
& git @gitPrefix push -u $Remote $Branch
if ($LASTEXITCODE -ne 0) {
    Write-Fail 'push 失败。常见原因：'
    Write-Fail '  - 远程有新提交，先执行: git pull --rebase'
    Write-Fail '  - 凭据过期，重新登录 GitHub（Git Credential Manager 会弹窗）'
    Write-Fail '  - 代理中途断了，重试一次'
    exit 1
}

Write-Ok '推送完成 ✔'
