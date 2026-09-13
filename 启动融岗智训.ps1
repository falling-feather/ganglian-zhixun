[CmdletBinding()]
param(
  [ValidateSet("student", "teacher", "admin")]
  [string]$Role = "student",

  [switch]$FreshData,
  [switch]$SkipInstall,
  [switch]$SkipBuild,
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [Console]::OutputEncoding

$repositoryRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$applicationRoot = $repositoryRoot
$manifestPath = Join-Path $applicationRoot "package.json"

if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
  throw "没有找到程序清单：$manifestPath"
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "未找到 Node.js。请先安装 Node.js 22.12 或更高版本。"
}
if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  throw "未找到 Corepack。请使用包含 Corepack 的 Node.js 22 环境。"
}

$env:DEMO_OPEN_BROWSER = if ($NoBrowser) { "0" } else { "1" }
$env:DEMO_OPEN_ROLE = $Role
if ($SkipBuild) {
  $env:DEMO_SKIP_BUILD = "1"
} else {
  Remove-Item Env:DEMO_SKIP_BUILD -ErrorAction SilentlyContinue
}

$scriptName = if ($FreshData) { "start:fresh" } else { "start" }

Push-Location -LiteralPath $applicationRoot
try {
  Write-Host "[融岗智训] 程序目录：$applicationRoot" -ForegroundColor Cyan
  Write-Host "[融岗智训] 体验身份：$Role；数据模式：$(if ($FreshData) { '全新数据' } else { '复用演示进度' })" -ForegroundColor Cyan

  & corepack pnpm preflight
  if ($LASTEXITCODE -ne 0) {
    throw "运行环境预检失败。"
  }

  if (-not $SkipInstall) {
    & corepack pnpm install --frozen-lockfile
    if ($LASTEXITCODE -ne 0) {
      throw "依赖安装失败。"
    }
  }

  $browserHint = if ($NoBrowser) {
    "就绪后请使用终端输出的角色 URL。"
  } else {
    "就绪后会自动打开浏览器。"
  }
  Write-Host "[融岗智训] 正在构建并启动，首次运行需要几分钟；$browserHint" -ForegroundColor Green
  Write-Host "[融岗智训] 停止服务请回到此窗口按 Ctrl+C。" -ForegroundColor Green
  & corepack pnpm run $scriptName
  if ($LASTEXITCODE -ne 0) {
    throw "融岗智训启动失败，退出码：$LASTEXITCODE"
  }
} finally {
  Pop-Location
}
