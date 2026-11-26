@echo off
rem ASCII-only on purpose: cmd.exe misparses UTF-8 bytes in batch files.
rem Prompts for Eternal Return OpenAPI Key in memory ONLY (never saved to any file).
rem
rem Double-click  -> prompts for API key, fetches official OpenAPI tables + syncs characters/items/mastery + self-check
rem Command line  -> update-bser.cmd -Full          (official OpenAPI + dak.gg avatars/icons + 119 routes + auto-promote new hero)
rem                  update-bser.cmd -CheckOnly     (read-only check whether official API has updated)
rem                  update-bser.cmd -Hero Meissa   (inspect a specific hero's readiness)
rem                  update-bser.cmd -Force         (re-download all official tables ignoring hash cache)

setlocal
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\update-bser.ps1" %*

echo.
pause
endlocal
