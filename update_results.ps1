<#
  TOOL CẬP NHẬT KẾT QUẢ XSMB (27 GIẢI) VÀO DỮ LIỆU JSON
  Cách dùng:
  1. Click chuột phải -> Run with PowerShell
  2. Hoặc nhập tay ngày, giải đặc biệt và 27 số lô để ghi vào data/xsmb_history.json
#>

param(
    [string]$Date = (Get-Date -Format "yyyy-MM-dd"),
    [string]$Special = "",
    [string]$LottoNumbers = ""
)

$jsonPath = Join-Path $PSScriptRoot "data\xsmb_history.json"

if (-not (Test-Path $jsonPath)) {
    Write-Host "[ERROR] Khong tim thay file du lieu: $jsonPath" -ForegroundColor Red
    Exit
}

$rawJson = Get-Content -Path $jsonPath -Raw -Encoding UTF8
$history = $rawJson | ConvertFrom-Json

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   XSMB PRO 27 - CẬP NHẬT KẾT QUẢ MỚI     " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan

if ([string]::IsNullOrWhiteSpace($Special)) {
    Write-Host "Nhap Ngay mo thuong (Mac dinh hom nay: $Date): " -NoNewline
    $inputDate = Read-Host
    if (-not [string]::IsNullOrWhiteSpace($inputDate)) { $Date = $inputDate }

    Write-Host "Nhap Giai Dac Biet (vi du: 64835): " -NoNewline
    $Special = Read-Host

    Write-Host "Nhap 27 con lo 2 so cuoi (cach nhau boi khoang trang hoac dau phay): " -NoNewline
    $LottoNumbers = Read-Host
}

$lottoArray = $LottoNumbers -split "[\s,]+" | Where-Object { $_ -ne "" } | ForEach-Object { $_.PadLeft(2, '0') }

if ($lottoArray.Count -lt 20) {
    Write-Host "[CANH BAO] So luong con lo nhap vao it hon 27! ($($lottoArray.Count) con)" -ForegroundColor Yellow
}

$newEntry = [PSCustomObject]@{
    date = $Date
    special = $Special
    prizes = @($Special)
    lotto = $lottoArray
}

# Them vao dau danh sach
$updatedHistory = @($newEntry) + $history

$updatedJson = $updatedHistory | ConvertTo-Json -Depth 5
[System.IO.File]::WriteAllText($jsonPath, $updatedJson, [System.Text.Encoding]::UTF8)

# Dong thoi cap nhat xsmb_data.js de mo index.html offline khong bao gio loi
$jsDataPath = Join-Path $PSScriptRoot "data\xsmb_data.js"
$jsContent = "window.XSMB_DATA = " + $updatedJson + ";"
[System.IO.File]::WriteAllText($jsDataPath, $jsContent, [System.Text.Encoding]::UTF8)

Write-Host ""
Write-Host "[THANH CONG] Da luu ket qua ngay $Date vao he thong!" -ForegroundColor Green
Write-Host "Mo file index.html de xem thong ke & goi y moi nhat!" -ForegroundColor Cyan
Write-Host ""
Pause
