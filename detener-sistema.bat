@echo off
title Deteniendo Sistema de Inventario CREDISA
echo.
echo ========================================
echo  DETENIENDO SISTEMA DE INVENTARIO
echo ========================================
echo.

cd /d "%~dp0"
docker compose -f docker-compose.yml -f docker-compose.prod.yml down

echo.
echo Sistema detenido. Los datos de la base de datos se conservan.
echo.
pause