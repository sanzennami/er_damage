@echo off
rem ASCII-only on purpose: cmd.exe misparses UTF-8 bytes in batch files.
rem All Chinese output lives in scripts\update.ps1 and scripts\auto-update.mjs.
rem
rem Double-click  -> auto-detects local proxy, syncs game data + icons + routes, writes docs\auto-update-report.md
rem Command line  -> update.cmd -SkipRoutes
rem                  update.cmd -Proxy http://127.0.0.1:7897
rem                  update.cmd -Offline

setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update.ps1" %*

echo.
pause
endlocal
