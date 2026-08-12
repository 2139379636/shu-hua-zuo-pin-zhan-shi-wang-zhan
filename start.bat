@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo.
echo ============================================
echo   Huang Guiming Gallery - Dev Server
echo ============================================
echo.
echo   Local: http://127.0.0.1:8080/
echo   LAN:    http://(运行 ipconfig 查 IPv4):8080/
echo   按 Ctrl+C 停止
echo.
python dev-server.py 8080 0.0.0.0
pause
