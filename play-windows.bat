@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 22 or newer is required. Install it from https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing local game dependencies...
  call npm install
  if errorlevel 1 goto :error
)
echo Starting Lanka Run: Schoolboy Rush...
call npm run dev -- --host 127.0.0.1 --open
exit /b %errorlevel%
:error
echo Setup failed. Check your connection and run npm install again.
pause
exit /b 1
