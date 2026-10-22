@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title SL BAD BOY - Android APK Builder

echo.
echo ============================================================
echo   SL BAD BOY - Android APK Builder
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 22 or newer is required. Install it and reopen this window.
  exit /b 1
)
node -e "if (Number(process.versions.node.split('.')[0]) < 22) process.exit(1)"
if errorlevel 1 (
  echo [ERROR] This project requires Node.js 22 or newer.
  exit /b 1
)
if not defined JAVA_HOME (
  where java >nul 2>nul
  if errorlevel 1 (
    echo [ERROR] Java 17 is required. Install Android Studio or set JAVA_HOME.
    exit /b 1
  )
)
if not defined ANDROID_HOME if not defined ANDROID_SDK_ROOT if not exist "android\local.properties" (
  echo [ERROR] Android SDK not found. Set ANDROID_HOME or run Android Studio once.
  exit /b 1
)

if not exist "node_modules" (
  echo [1/6] Installing Node dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
) else (
  echo [1/6] Node dependencies already installed.
)

echo [2/6] Building the complete SL BAD BOY web game...
call npm run build
if errorlevel 1 exit /b 1

echo [3/6] Generating Android launcher and splash artwork...
call npm run assets:android
if errorlevel 1 exit /b 1

echo [4/6] Syncing the offline game and native plugins...
call npx cap sync android
if errorlevel 1 exit /b 1

echo [5/6] Compiling the Android APK with Gradle...
pushd android
call gradlew.bat assembleDebug
set BUILD_RESULT=%ERRORLEVEL%
popd
if not "%BUILD_RESULT%"=="0" exit /b %BUILD_RESULT%

if not exist "android\app\build\outputs\apk\debug\app-debug.apk" (
  echo [ERROR] Gradle finished but the expected APK was not found.
  exit /b 1
)
if not exist "artifacts" mkdir "artifacts"
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "artifacts\SL-BAD-BOY.apk" >nul
if errorlevel 1 exit /b 1

echo [6/6] SUCCESS!
echo.
echo   APK: %CD%\artifacts\SL-BAD-BOY.apk
echo   App: SL BAD BOY ^(lk.shaun.slbadboy^)
echo   Type: Installable debug-signed Android package
echo.
endlocal
