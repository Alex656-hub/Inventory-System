@echo off
title Iniciando Sistema de Inventario CREDISA
echo.
echo ========================================
echo  INICIANDO SISTEMA DE INVENTARIO CREDISA
echo ========================================
echo.
echo Por favor espera... (tarda 10-30 seg la primera vez)
echo.

cd /d "%~dp0"
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.docker up -d

echo.
echo ========================================
echo  SISTEMA INICIADO CORRECTAMENTE
echo ========================================
echo.
echo Abre tu navegador y ve a: http://localhost
echo Usuario: gerente
echo Contraseña: gerente123
echo.
pause