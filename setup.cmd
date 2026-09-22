@echo off
setlocal
where bun >nul 2>nul
if %errorlevel% equ 0 (
  bun "%~dp0src\setup.mjs" %*
) else (
  where node >nul 2>nul
  if errorlevel 1 (
    echo AI setup needs Bun or Node.js 18 or newer.
    echo.
    pause
    exit /b 1
  )
  node "%~dp0src\setup.mjs" %*
)
if "%~1"=="" pause
