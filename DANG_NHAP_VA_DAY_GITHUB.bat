@echo off
title Ket noi GitHub va Day code len Do-Den
echo =================================================================
echo        DANG KHOI CHAY KET NOI GITHUB: Longvd1999/Do-Den
echo =================================================================
echo.
echo 1. Trinh duyet se mo trang xac nhan GitHub (github.com/login/device)
echo 2. Cua so nay se hien mot ma gom 8 chu cai (vi du: 1234-ABCD)
echo 3. Ban chi can nhap ma do vao trinh duyet roi bam Authorize!
echo.
echo Dang xac thuc...
"C:\Program Files\GitHub CLI\gh.exe" auth login -h github.com -p https -w
echo.
echo =================================================================
echo        DANG DAY TOAN BO CODE VA DU LIEU LEN GITHUB...
echo =================================================================
"C:\Program Files\GitHub CLI\gh.exe" auth setup-git
"C:\Program Files\Git\bin\git.exe" push -u origin main --force
echo.
echo =================================================================
echo   [THANH CONG] DA DAY TOAN BO CODE LEN KHO GITHUB Longvd1999/Do-Den!
echo =================================================================
pause
