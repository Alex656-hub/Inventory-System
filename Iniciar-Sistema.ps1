# Iniciar-Sistema.ps1 - Ejecutar como Administrador
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SISTEMA DE INVENTARIO CREDISA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del script
Set-Location $PSScriptRoot

Write-Host "[1/3] Levantando contenedores..." -ForegroundColor Yellow
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.docker up -d

Write-Host ""
Write-Host "[2/3] Esperando a que los servicios esten listos..." -ForegroundColor Yellow
Write-Host "(Esto puede tardar 10-30 segundos la primera vez)" -ForegroundColor Gray
Write-Host ""

$maxAttempts = 60
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts -and -not $ready) {
    $attempt++
    Write-Host "    Intento $attempt/$maxAttempts - Verificando API..." -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host " OK!" -ForegroundColor Green
            $ready = $true
        } else {
            Write-Host " Esperando..."
        }
    } catch {
        Write-Host " Esperando..."
    }
    
    if (-not $ready) {
        Start-Sleep -Seconds 3
    }
}

if (-not $ready) {
    Write-Host ""
    Write-Host "ERROR: La API no respondio despues de $maxAttempts intentos" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "[3/3] API lista. Abriendo navegador..." -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "  SISTEMA INICIADO CORRECTAMENTE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "URL: http://localhost" -ForegroundColor Cyan
Write-Host "Usuario: gerente" -ForegroundColor Cyan
Write-Host "Contraseña: gerente123" -ForegroundColor Cyan
Write-Host ""

# Abrir navegador
Start-Process "http://localhost"

Write-Host "Presiona Enter para cerrar esta ventana..."
Read-Host