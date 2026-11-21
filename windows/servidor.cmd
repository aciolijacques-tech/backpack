@echo off
rem Backpack - servidor ligado pelo Windows (atalho na pasta Inicializar, feito pelo instalador).
rem Se cair com erro, liga de novo. Saida 0 (botao Desligar) para de vez. Saida 75 = atualizou, religa na hora.
cd /d "%~dp0.."
set BACKPACK_SERVICO=1
set "NODE=node"
where node >nul 2>&1 || if exist "data\node.txt" set /p NODE=<"data\node.txt"
if not exist "data\logs" mkdir "data\logs"
:ligar
"%NODE%" server.js >> "data\logs\server.log" 2>&1
if not errorlevel 1 exit /b 0
if errorlevel 75 if not errorlevel 76 goto ligar
ping -n 11 127.0.0.1 >nul
goto ligar
