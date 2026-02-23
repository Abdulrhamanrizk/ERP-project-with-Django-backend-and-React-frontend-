Set-Location $PSScriptRoot
Write-Host "Starting ERP Backend on port 8001..." -ForegroundColor Green
& ".\venv\Scripts\python.exe" manage.py runserver 8001
