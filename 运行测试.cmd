@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ER Damage Calculator - 本地预览测试
echo 正在启动本地测试服务器并自动打开浏览器...
echo （测试完毕直接关掉这个黑框即可停止服务）
echo.
start "" "http://localhost:5173"
call npm run dev
pause