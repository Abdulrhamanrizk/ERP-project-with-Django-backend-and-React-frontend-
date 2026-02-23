@echo off
cd /d "%~dp0"
echo Starting ERP Backend on port 8001...
".\venv\Scripts\python.exe" manage.py runserver 8001
pause
