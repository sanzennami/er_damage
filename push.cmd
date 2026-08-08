@echo off
rem ASCII-only on purpose: cmd.exe misparses UTF-8 bytes in batch files,
rem which silently breaks argument passthrough. All Chinese text lives in
rem scripts\push.ps1 instead.
rem
rem Double-click  -> prompts for a commit message.
rem Command line  -> push.cmd -Message "fix skill table" -Proxy http://127.0.0.1:7897
rem                  push.cmd -DryRun

setlocal
cd /d "%~dp0"

if "%~1"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push.ps1" -PromptMessage
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push.ps1" %*
)

echo.
pause
endlocal
