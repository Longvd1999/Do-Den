@echo off
title Day code len GitHub - Longvd1999/Do-Den
echo ==================================================
echo   DANG DAY CODE LEN GITHUB: Longvd1999/Do-Den
echo ==================================================
"C:\Program Files\Git\bin\git.exe" push -u origin main
echo.
echo ==================================================
if %ERRORLEVEL% EQU 0 (
   echo   DA DAY CODE LEN GITHUB THANH CONG 100%!
) else (
   echo   DANG CHO DANG NHAP HOAC CO LOI XAY RA.
)
echo ==================================================
pause
