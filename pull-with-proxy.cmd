@echo off
chcp 65001 >nul
cd /d "%~dp0"
set PROXY_PORT=7897
set HTTP_PROXY=http://127.0.0.1:%PROXY_PORT%
set HTTPS_PROXY=http://127.0.0.1:%PROXY_PORT%
set ALL_PROXY=http://127.0.0.1:%PROXY_PORT%

echo ========================================================
echo 已挂载本地代理 127.0.0.1:%PROXY_PORT%
echo 1. 正在清理错位的旧 master 缓存并重新拉取最新 er-gamedata ...
echo ========================================================

:: 直接删掉绑定了错误 master 分支的旧缓存，重新浅克隆远端最新默认分支（仅几MB，走代理几秒下完）
if exist ".er-gamedata-cache" (
  rmdir /s /q ".er-gamedata-cache"
)

git -c http.proxy=%HTTP_PROXY% -c https.proxy=%HTTPS_PROXY% clone --depth 1 https://github.com/pypy-vrc/er-gamedata.git ".er-gamedata-cache"
if errorlevel 1 (
  echo.
  echo ❌ Git 克隆失败，请检查代理软件是否开启且端口为 %PROXY_PORT%
  pause
  exit /b 1
)

echo.
echo 2. 正在导出最新解包数据并补齐预设与补丁 ...
:: 传入 git 代理配置，避免 update-er-gamedata.mjs 内部的 git pull 报错
set GIT_CONFIG_COUNT=2
set GIT_CONFIG_KEY_0=http.proxy
set GIT_CONFIG_VALUE_0=%HTTP_PROXY%
set GIT_CONFIG_KEY_1=https.proxy
set GIT_CONFIG_VALUE_1=%HTTPS_PROXY%

call node scripts/update-er-gamedata.mjs
call node scripts/apply-patch-log.mjs

echo.
echo ✅ 最新解包拉取与同步彻底完成！
pause