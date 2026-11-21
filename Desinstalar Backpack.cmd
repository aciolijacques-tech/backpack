@echo off
rem Backpack - desinstala no Windows. Nao apaga seus dados (pasta data\).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0windows\desinstalar.ps1"
