[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$prototypeRoot = $PSScriptRoot
$repositoryRoot = [System.IO.Path]::GetFullPath((Join-Path $prototypeRoot '../../..'))
$vitePath = Join-Path $repositoryRoot 'apps/web/node_modules/vite/bin/vite.js'
if (-not (Test-Path -LiteralPath $vitePath)) { throw '请先在项目根目录安装已有依赖。' }
$nodePath = (Get-Command node -ErrorAction Stop).Source
Push-Location -LiteralPath $prototypeRoot
try {
  Write-Host '教师首页样机：http://127.0.0.1:4185/ ；按 Ctrl+C 停止。'
  & $nodePath $vitePath --config vite.config.mjs
  if ($LASTEXITCODE -ne 0) { throw "预览服务退出，代码：$LASTEXITCODE" }
} finally { Pop-Location }
