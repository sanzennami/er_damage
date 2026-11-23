@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ER Damage - 7897代理一键拉取头像/S13潜能/解包
set PROXY_PORT=7897
set HTTP_PROXY=http://127.0.0.1:%PROXY_PORT%
set HTTPS_PROXY=http://127.0.0.1:%PROXY_PORT%
set ALL_PROXY=http://127.0.0.1:%PROXY_PORT%

echo ========================================================
echo 已挂载本地代理 127.0.0.1:%PROXY_PORT%
echo [1/5] 同步 GitHub 最新 er-gamedata 解包...
echo ========================================================
if exist ".er-gamedata-cache" rmdir /s /q ".er-gamedata-cache"
git -c http.proxy=%HTTP_PROXY% -c https.proxy=%HTTPS_PROXY% clone --depth 1 https://github.com/pypy-vrc/er-gamedata.git ".er-gamedata-cache"
set GIT_CONFIG_COUNT=2
set GIT_CONFIG_KEY_0=http.proxy
set GIT_CONFIG_VALUE_0=%HTTP_PROXY%
set GIT_CONFIG_KEY_1=https.proxy
set GIT_CONFIG_VALUE_1=%HTTPS_PROXY%
call node scripts/update-er-gamedata.mjs

echo.
echo ========================================================
echo [2/5] 走代理自动补齐缺失实验体小头像 (DAK.GG / Fandom)...
echo ========================================================
call node --import ./scripts/lib/proxy-preload.mjs scripts/fetch-dak-character-avatars.mjs --write

echo.
echo ========================================================
echo [3/5] 走代理拉取 S13 最新潜能列表、图标与战术技能...
echo ========================================================
call node --import ./scripts/lib/proxy-preload.mjs scripts/fetch-dak-loadout-assets.mjs

echo.
echo ========================================================
echo [4/5] 修复选英雄头像隐身 Bug + 同步 S13 潜能数值与装备词条...
echo ========================================================
call node --import ./scripts/lib/proxy-preload.mjs scripts/fix-avatar-and-s13-traits.mjs

echo.
echo ========================================================
echo [5/5] 校验补丁并执行生产构建 npm run build...
echo ========================================================
call node scripts/apply-patch-log.mjs
call npm run build

echo.
echo ✅ 头像、S13潜能与构建验证全部完成！（若 preview-local.cmd 正在运行，重启一下即可加载新下载的头像文件）
pause