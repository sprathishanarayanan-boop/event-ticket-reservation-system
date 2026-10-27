@echo off
echo ========================================================
echo   Pushing EventPass Reservation System to GitHub...
echo ========================================================
cd /d "%~dp0"
git push -u origin main
echo.
pause
