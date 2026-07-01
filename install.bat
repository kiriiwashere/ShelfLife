@echo off
title ShelfLife ENV Setup
echo ===================================================
echo   ShelfLife - ENV Installation
echo ===================================================
echo.

:: Check Node.js installation
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js v16+ from https://nodejs.org/ and try again.
    echo.
    pause
    exit /b 1
)

echo [1/3] Node.js detected.
echo.

echo [2/3] Installing package dependencies...
call cmd /c npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install npm dependencies.
    echo Please verify your internet connection and try running "npm install" manually.
    echo.
    pause
    exit /b 1
)

echo.
echo [3/3] Configuring Database...
echo      [1] Production Mode (Clean DB, admin user only)
echo      [2] Demo Mode (Preloaded items, staff user, usage history)
echo.
set /p INST_MODE="Enter selection (1 or 2) [Default: 2]: "

if "%INST_MODE%"=="1" (
    echo Initializing clean database for production...
    call node seed.js --prod
) else (
    echo Seeding database with demo data...
    call node seed.js --demo
)

echo.
echo ===================================================
echo   Installation Completed Successfully!
echo ===================================================
echo.
echo   To launch the application, run: start.bat
echo.
echo   Default Administrator Credentials:
echo     - Username: admin
echo     - Password: admin123
echo.
echo ===================================================
pause
