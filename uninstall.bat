@echo off
title ShelfLife Uninstaller
echo ===================================================
echo   ShelfLife - ENV Uninstallation
echo ===================================================
echo.
echo   WARNING: This action will permanently delete:
echo     - All installed dependencies (node_modules)
echo     - The local database and ALL inventory history (data/)
echo.
set /p CONFIRM="Are you absolutely sure you want to proceed? (Y/N): "

if /i "%CONFIRM%" neq "Y" (
    echo.
    echo Uninstallation cancelled.
    echo.
    pause
    exit /b 0
)

echo.
echo [1/3] Removing installed packages (node_modules)...
if exist "node_modules" (
    rmdir /s /q "node_modules"
)
if exist "package-lock.json" (
    del /f /q "package-lock.json"
)

echo [2/3] Deleting database files and logs (data)...
if exist "data" (
    rmdir /s /q "data"
)

echo [3/3] Cleaning up temporary files...
if exist "data/db.json.tmp" (
    del /f /q "data/db.json.tmp"
)

echo.
echo ===================================================
echo   Uninstallation Completed Cleanly.
echo ===================================================
echo.
pause
