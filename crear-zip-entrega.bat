@echo off
title Creando ZIP Limpio para Entrega
color 0A
echo.
echo ========================================
echo  CREANDO PAQUETE LIMPIO PARA ENTREGA
echo ========================================
echo.

cd /d "%~dp0"

set PROJECT_NAME=Inventory-System
set ZIP_NAME=%PROJECT_NAME%-entrega-%date:~-4,4%%date:~-10,2%%date:~-7,2%.zip

echo [1/3] Verificando PowerShell...
powershell -Command "Get-Host" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: PowerShell no encontrado.
    pause
    exit /b 1
)

echo [2/3] Creando ZIP PRESERVANDO CARPETAS...
echo Excluyendo: .git, .opencode, .agents, node_modules, dist, build, .vs, .vscode, skills-lock.json, agents.md, *.log, *.tmp, *.zip
echo.

powershell -NoProfile -File "%~dp0crear-zip.ps1" -ZipName "%ZIP_NAME%"

if %errorlevel% neq 0 (
    echo ERROR: Fallo al crear ZIP.
    pause
    exit /b 1
)

echo.
echo [3/3] Verificando estructura de carpetas...
powershell -Command "Expand-Archive -Path '%ZIP_NAME%' -DestinationPath 'verify_zip' -Force; tree verify_zip /F | findstr /C:'---' /C:'backend' /C:'frontend' /C:'database'; Remove-Item -Recurse -Force 'verify_zip' -ErrorAction SilentlyContinue"

if %errorlevel% neq 0 (
    echo ERROR: Verificacion fallo - no se detectan carpetas.
    pause
    exit /b 1
)

echo.
echo ========================================
echo  ZIP CREADO CON CARPETAS CORRECTAS
echo ========================================
echo.
for %%F in ("%ZIP_NAME%") do set ZIP_SIZE=%%~zF
set /a ZIP_MB=%ZIP_SIZE%/1024/1024
echo Archivo: %ZIP_NAME% (~%ZIP_MB% MB)
echo.
echo LISTO PARA ENTREGAR
pause