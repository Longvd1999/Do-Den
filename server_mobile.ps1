<#
  MÁY CHỦ WEB TỐI ƯU CHO ĐIỆN THOẠI (KHÔNG CẦN CÀI ĐẶT)
  Chạy trực tiếp bằng PowerShell native trên Windows
#>

$port = 8080
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi*", "Ethernet*" | Where-Object { $_.IPAddress -notlike "169.254*" } | Select-Object -First 1).IPAddress

if (-not $ip) { $ip = "localhost" }

$url = "http://${ip}:${port}/"
$localUrl = "http://localhost:${port}/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://*:${port}/")

try {
    $listener.Start()
} catch {
    # Neu can admin de bind wildcard http://*, fallback bind local/ip
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:${port}/")
    $listener.Prefixes.Add("http://127.0.0.1:${port}/")
    try {
        $listener.Prefixes.Add("http://${ip}:${port}/")
        $listener.Start()
    } catch {
        Write-Host "[CANH BAO] Khong the bind IP ngoai: $($_.Exception.Message)" -ForegroundColor Yellow
        $listener = New-Object System.Net.HttpListener
        $listener.Prefixes.Add("http://+:${port}/")
        $listener.Start()
    }
}

Clear-Host
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "      XSMB QUANT PRO - MÁY CHỦ KẾT NỐI ĐIỆN THOẠI               " -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  DIEN THOAI VA MAY TINH CUNG BAT 1 MANG WI-FI / MANG NOI BO" -ForegroundColor Green
Write-Host ""
Write-Host "  👉 Mo trinh duyet tren dien thoai (Safari / Chrome) go:" -ForegroundColor White
Write-Host "     $url" -ForegroundColor Yellow -BackgroundColor DarkBlue
Write-Host ""
Write-Host "  (Hoac tren may tinh nay: $localUrl)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Bam Ctrl + C de dung may chu khi khong su dung." -ForegroundColor DarkGray
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        $path = $request.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($path)) { $path = "index.html" }

        $filePath = Join-Path $root $path

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $contentType = "application/octet-stream"
            if ($ext -eq ".html" -or $ext -eq ".htm") { $contentType = "text/html; charset=utf-8" }
            elseif ($ext -eq ".js") { $contentType = "application/javascript; charset=utf-8" }
            elseif ($ext -eq ".json") { $contentType = "application/json; charset=utf-8" }
            elseif ($ext -eq ".css") { $contentType = "text/css; charset=utf-8" }
            elseif ($ext -eq ".png") { $contentType = "image/png" }
            elseif ($ext -eq ".svg") { $contentType = "image/svg+xml" }

            $response.ContentType = $contentType
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($err, 0, $err.Length)
        }
        $response.Close()
    } catch {
        # Bo qua loi client ngat ket noi
    }
}
