<#
.SYNOPSIS
    一键自动探测本地网络代理并执行零 Agent 日常版本数据更新。

.DESCRIPTION
    自动探测代理（环境变量 / Windows 系统代理 / Clash·v2ray 常见端口 7897,7890,10809... / 直连）
    -> 执行 scripts/auto-update.mjs（同步解包表、装备/角色面板、图标与独有特效、119 套高赞出装、生成待核对报告与自检）。
    代理仅对本次运行生效，不改动全局或仓库 git config。

.EXAMPLE
    .\scripts\update.ps1
    .\scripts\update.ps1 -SkipRoutes
    .\scripts\update.ps1 -Proxy http://127.0.0.1:7897
    .\scripts\update.ps1 -Offline
#>

[CmdletBinding()]
param(
    [string]$Proxy,
    [string]$BserKey,
    [switch]$SkipRoutes,
    [switch]$Offline,
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
        if ($ie.ProxyServer -and $ie.ProxyEnable -eq 1) {
            Add-Candidate $ie.ProxyServer '系统代理设置（已启用）'
        }
    } catch { }

    foreach ($port in @(7897, 7890, 7891, 10809, 10808, 1080, 1081, 8889, 8118, 20171, 33210)) {
        Add-Candidate "http://127.0.0.1:$port" "常见本地代理端口 $port"
    }

    return $candidates
}

function Resolve-Proxy {
    if ($Offline -or $NoProxy) {
        return $null
    }
    Write-Step '探测本地可用网络通道...'
    foreach ($c in Get-ProxyCandidates) {
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

$usedBserApi = $false
if (-not $Offline -and (-not [string]::IsNullOrWhiteSpace($BserKey) -or -not [string]::IsNullOrWhiteSpace($env:BSER_API_KEY))) {
    try {
        if (-not [string]::IsNullOrWhiteSpace($BserKey)) { $env:BSER_API_KEY = $BserKey.Trim() }
        $bserArgs = @('scripts/sync-bser-openapi.mjs', '--cache-only')
        if ($activeProxy) { $bserArgs += @('--proxy', $activeProxy) }
        if ($NoProxy)     { $bserArgs += '--no-proxy' }
        & node @bserArgs
        if ($LASTEXITCODE -eq 0) { $usedBserApi = $true }
    } finally {
        Remove-Item Env:\BSER_API_KEY -ErrorAction SilentlyContinue
    }
}

$nodeArgs = @('scripts/auto-update.mjs')
if ($usedBserApi) { $nodeArgs += '--skip-gamedata-git' }
if ($activeProxy) { $nodeArgs += @('--proxy', $activeProxy) }
if ($SkipRoutes)  { $nodeArgs += '--skip-routes' }
if ($Offline)     { $nodeArgs += '--offline' }

& node @nodeArgs
if ($LASTEXITCODE -ne 0) {
    Write-Fail '自动更新脚本执行失败，请检查上方错误提示。'
    exit $LASTEXITCODE
}

Write-Host ''
Write-Ok '更新完成！请查看 docs\auto-update-report.md 核对是否有技能/特效数字变动。'
Write-Ok '确认无误后可直接双击 push.cmd 或运行 npm run push 推送上线。'
