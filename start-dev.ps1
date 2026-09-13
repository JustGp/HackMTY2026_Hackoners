$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ServerPath = Join-Path $Root 'server_cmp'
$FrontendPath = Join-Path $Root 'frontend-a2ui'

if (-not (Test-Path (Join-Path $ServerPath 'main.py'))) {
    throw "No se encontró server_cmp/main.py"
}

if (-not (Test-Path (Join-Path $FrontendPath 'package.json'))) {
    throw "No se encontró frontend-a2ui/package.json"
}

Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    "Set-Location -LiteralPath '$ServerPath'; python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000"
)

Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-Command',
    "Set-Location -LiteralPath '$FrontendPath'; npm run dev"
)

Write-Host 'Backend iniciado en http://127.0.0.1:8000' -ForegroundColor Green
Write-Host 'Frontend iniciando con Vite en http://localhost:5173' -ForegroundColor Green
Write-Host 'Se abrieron dos terminales nuevas. Cierra cada proceso con Ctrl+C.' -ForegroundColor Yellow
