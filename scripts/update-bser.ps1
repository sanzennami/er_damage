<#
.SYNOPSIS
    永恒轮回官方 OpenAPI 一键抓取与本地数据更新入口（API Key 仅在内存中使用，绝不落盘）。

.DESCRIPTION
    1. 若未通过命令行或临时环境变量传入 Key，交互式提示粘贴官方 OpenAPI Key（不写入任何本地文件、不留命令历史）。
    2. 自动探测本地代理（环境变量 / Windows 系统代理 / Clash·v2ray 常见端口 7897,7890... / 直连）。
    3. 默认极速纯官方模式：拉取官方 OpenAPI 核心表与简中/英文 l10n -> 更新 masteryStats / weaponTypeInfo / equipment / characters -> 输出最新实验体看板 -> 自检。
    4. 加 -Full 参数：在拉完官方 OpenAPI 后继续执行 auto-update.mjs（增量补抓 dak.gg 小头像、图标、119 套高赞出装，并在条件齐全时自动将新实验体转正开放）。

.EXAMPLE
    .\scripts\update-bser.ps1
    .\scripts\update-bser.ps1 -Full
    .\scripts\update-bser.ps1 -CheckOnly
    .\scripts\update-bser.ps1 -Hero 弥莎
#>

[CmdletBinding()]
param(
    [string]$Key,
    [string]$Hero,
    [string]$Proxy,
    [switch]$Full,
    [switch]$SkipRoutes,
    [switch]$CheckOnly,
    [switch]$Force,
    [switch]$NoProxy
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Write-Step { param([string]$Text) Write-Host "==> $Text" -ForegroundColor Cyan }
function Write-Ok   { param([string]$Text) Write-Host "    $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "    $Text" -ForegroundColor Yellow }
function Write-Fail { param([string]$Text) Write-Host "    $Text" -ForegroundColor Red }

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
    if ($v -match '(?:^|;)\s*https?=([^;]+)') { $v = $Matches[1].Trim() }
    elseif ($v -match ';') { $v = ($v -split ';')[0].Trim() }
    if ($v -notmatch '^[a-zA-Z0-9]+://') { $v = "http://$v" }
    return $v
}

function Resolve-Proxy {
    if ($NoProxy) { return $null }
    Write-Step '探测本地可用网络通道...'
    $candidates = New-Object System.Collections.Generic.List[object]
    $seen = New-Object System.Collections.Generic.HashSet[string]

    function Add-Candidate {
        param([string]$Url, [string]$Source)
        $n = ConvertTo-ProxyUrl $Url
        if (-not $n) { return }
        if (-not $seen.Add($n.ToLowerInvariant())) { return }
        $candidates.Add([pscustomobject]@{ Url = $n; Source = $Source })
    }

    if ($Proxy) { Add-Candidate $Proxy '命令行参数' }
    foreach ($name in @('ER_PUSH_PROXY', 'HTTPS_PROXY', 'HTTP_PROXY', 'ALL_PROXY')) {
        $val = [Environment]::GetEnvironmentVariable($name)
        if ($val) { Add-Candidate $val "环境变量 $name" }
    }
    try {
        $ie = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction Stop
        if ($ie.ProxyServer -and $ie.ProxyEnable -eq 1) {
            Add-Candidate $ie.ProxyServer '系统代理设置（已启用）'
        }
    } catch { }
    foreach ($port in @(7897, 7890, 7891, 10809, 10808, 1080, 1081, 8889, 8118, 20171, 33210)) {
        Add-Candidate "http://127.0.0.1:$port" "常见本地代理端口 $port"
    }

    foreach ($c in $candidates) {
        try {
            $u = [System.Uri]$c.Url
            if (Test-Port -ProxyHost $u.Host -Port $u.Port) {
                Write-Ok "命中可用代理 $($c.Url) [$($c.Source)]"
                return $c.Url
            }
        } catch { }
    }
    Write-Warn '未检测到常见本地代理端口，将尝试直连网络'
    return $null
}

# 1. 在内存中获取 API Key（绝不写入任何本地文件）
$memKey = if ($Key) { $Key.Trim() } elseif ($env:BSER_API_KEY) { $env:BSER_API_KEY.Trim() } else { '' }
if ([string]::IsNullOrWhiteSpace($memKey)) {
    Write-Host ''
    Write-Host '  [安全说明] API Key 仅在当前进程内存中使用，绝不保存到任何本地文件或日志。' -ForegroundColor DarkGray
    $memKey = (Read-Host '  请粘贴永恒轮回开发者 API Key（右键粘贴后按回车）').Trim().Trim('"').Trim("'")
    if ([string]::IsNullOrWhiteSpace($memKey)) {
        Write-Fail '未输入 API Key，已退出。'
        exit 1
    }
}

$activeProxy = Resolve-Proxy
if ($activeProxy) {
    $env:HTTP_PROXY = $activeProxy
    $env:HTTPS_PROXY = $activeProxy
    $env:NODE_USE_ENV_PROXY = '1'
    $env:GIT_CONFIG_COUNT = '2'
    $env:GIT_CONFIG_KEY_0 = 'http.proxy'
    $env:GIT_CONFIG_VALUE_0 = $activeProxy
    $env:GIT_CONFIG_KEY_1 = 'https.proxy'
    $env:GIT_CONFIG_VALUE_1 = $activeProxy
}

try {
    # 仅挂载到当前进程环境变量传递给子进程，执行完毕在 finally 中立即销毁
    $env:BSER_API_KEY = $memKey

    $bserArgs = @('scripts/sync-bser-openapi.mjs')
    if ($activeProxy) { $bserArgs += @('--proxy', $activeProxy) }
    if ($NoProxy)     { $bserArgs += '--no-proxy' }
    if ($Hero)        { $bserArgs += @('--hero', $Hero) }
    if ($CheckOnly)   { $bserArgs += '--check-only' }
    if ($Force)       { $bserArgs += '--force' }
    if ($Full -and -not $CheckOnly) { $bserArgs += '--cache-only' }

    & node @bserArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Fail '官方 OpenAPI 同步未成功，请检查上方提示。'
        exit $LASTEXITCODE
    }
} finally {
    Remove-Item Env:\BSER_API_KEY -ErrorAction SilentlyContinue
    $memKey = $null
}

if ($Full -and -not $CheckOnly) {
    Write-Host ''
    Write-Step '串联执行全量资源与推荐出装同步 (auto-update.mjs)...'
    $autoArgs = @('scripts/auto-update.mjs', '--skip-gamedata-git')
    if ($activeProxy) { $autoArgs += @('--proxy', $activeProxy) }
    if ($SkipRoutes)  { $autoArgs += '--skip-routes' }

    & node @autoArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Fail '全量后续同步执行失败，请检查上方错误提示。'
        exit $LASTEXITCODE
    }
}
