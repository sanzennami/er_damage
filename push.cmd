@echo off
chcp 65001 >nul
setlocal

rem 一键推送到 GitHub（自动探测本机代理）。
rem 双击运行会提示输入提交信息；也可以在命令行传参：
rem   push.cmd -Message "修好了技能表" -Proxy http://127.0.0.1:7897

cd /d "%~dp0"

if "%~1"=="" goto :ask
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push.ps1" %*
goto :done

:ask
set "COMMIT_MSG="
set /p "COMMIT_MSG=提交信息（直接回车用默认时间戳）: "
if "%COMMIT_MSG%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push.ps1"
) else (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\push.ps1" -Message "%COMMIT_MSG%"
)

:done
echo.
pause
endlocal
