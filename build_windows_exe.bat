@echo off
cd /d %~dp0

py -m pip install --upgrade pyinstaller
py -m pip install --upgrade openpyxl
py -m PyInstaller --onefile --name crmkiber crm_export_exe.py

echo.
echo Ready: dist\crmkiber.exe
pause
