$port = 2502
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()

$serverDir = $PSScriptRoot
$clientDir = Resolve-Path "$serverDir\..\client"
$dataDir = "$serverDir\data"
$boardsDir = "$dataDir\boards"
$indexFile = "$dataDir\index.json"

# Đảm bảo thư mục tồn tại
if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Force -Path $dataDir | Out-Null }
if (!(Test-Path $boardsDir)) { New-Item -ItemType Directory -Force -Path $boardsDir | Out-Null }
if (!(Test-Path $indexFile)) { Set-Content -Path $indexFile -Value "[]" -Encoding UTF8 }

Write-Host "Server running at http://localhost:$port/" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop."

# Helpers
function Send-Response($response, $statusCode, $contentType, $contentStr, $contentBytes) {
    $response.StatusCode = $statusCode
    $response.ContentType = $contentType
    
    # Hỗ trợ CORS
    $response.AppendHeader("Access-Control-Allow-Origin", "*")
    $response.AppendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
    $response.AppendHeader("Access-Control-Allow-Headers", "Content-Type")

    if ($contentBytes -ne $null) {
        $response.ContentLength64 = $contentBytes.Length
        $response.OutputStream.Write($contentBytes, 0, $contentBytes.Length)
    } elseif ($contentStr -ne $null) {
        # Đảm bảo UTF8 không bom
        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        $buffer = $utf8NoBom.GetBytes($contentStr)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
    }
    $response.OutputStream.Close()
}

function Get-RequestBody($request) {
    if (-not $request.HasEntityBody) { return "" }
    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
    $body = $reader.ReadToEnd()
    $reader.Close()
    return $body
}

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $urlPath = $request.Url.LocalPath

        # Xử lý CORS Preflight
        if ($request.HttpMethod -eq "OPTIONS") {
            Send-Response $response 200 "text/plain" "" $null
            continue
        }

        try {
            # --- ROUTING CHO API ---
            if ($urlPath -match "^/api/boards") {
                $id = $null
                # Regex bắt id ở cuối: /api/boards/xxxx
                if ($urlPath -match "^/api/boards/([^/]+)$") {
                    $id = $matches[1]
                }

                if ($request.HttpMethod -eq "GET" -and -not $id) {
                    # Lấy danh sách boards
                    $indexStr = Get-Content -Path $indexFile -Raw -Encoding UTF8
                    Send-Response $response 200 "application/json" $indexStr $null
                }
                elseif ($request.HttpMethod -eq "POST" -and -not $id) {
                    # Tạo board mới
                    $bodyRaw = Get-RequestBody $request
                    $bodyObj = $bodyRaw | ConvertFrom-Json
                    
                    # Đọc index hiện tại
                    $indexStr = Get-Content -Path $indexFile -Raw -Encoding UTF8
                    $indexObj = $indexStr | ConvertFrom-Json
                    # LƯU Ý 2: Bug PowerShell ép mảng 1 item thành object
                    if ($null -eq $indexObj) { $tempArray = @() }
                    elseif ($indexObj -isnot [System.Array]) { $tempArray = @($indexObj) }
                    else { $tempArray = [System.Collections.ArrayList]::new($indexObj) }

                    $newId = [guid]::NewGuid().ToString().Substring(0, 8)
                    # Lấy Timestamp milliseconds
                    $timestamp = [Math]::Floor([decimal](Get-Date (Get-Date).ToUniversalTime() -UFormat "%s") * 1000)
                    
                    $newBoard = @{
                        id = $newId
                        name = $bodyObj.name
                        lastModified = $timestamp
                    }
                    if ($tempArray -is [System.Collections.ArrayList]) {
                         $tempArray.Add($newBoard) | Out-Null
                    } else {
                         $tempArray += $newBoard
                    }
                    
                    # Convert object back to array JSON LƯU Ý 1: bảo vệ UTF8
                    $newIndexStr = $tempArray | ConvertTo-Json -Depth 5 -Compress
                    Set-Content -Path $indexFile -Value $newIndexStr -Encoding UTF8
                    
                    # Khởi tạo data board file rỗng "[]"
                    Set-Content -Path "$boardsDir\$newId.json" -Value "[]" -Encoding UTF8
                    
                    Send-Response $response 201 "application/json" ($newBoard | ConvertTo-Json -Compress) $null
                }
                elseif ($request.HttpMethod -eq "GET" -and $id) {
                    # Đọc nội dung board
                    $dataFile = "$boardsDir\$id.json"
                    if (Test-Path $dataFile) {
                        $dataStr = Get-Content -Path $dataFile -Raw -Encoding UTF8
                        Send-Response $response 200 "application/json" $dataStr $null
                    } else {
                        Send-Response $response 404 "application/json" '{"error":"Board not found"}' $null
                    }
                }
                elseif ($request.HttpMethod -eq "PUT" -and $id) {
                    # Ghi nội dung board (DÙNG RAW STRING để tránh lỗi ConvertFrom-Json bị giới hạn và lỗi ép type)
                    $bodyRaw = Get-RequestBody $request
                    $dataFile = "$boardsDir\$id.json"
                    Set-Content -Path $dataFile -Value $bodyRaw -Encoding UTF8
                    
                    # Update index modified time
                    $indexStr = Get-Content -Path $indexFile -Raw -Encoding UTF8
                    $indexObj = $indexStr | ConvertFrom-Json
                    if ($null -eq $indexObj) { $indexObj = @() }
                    if ($indexObj -isnot [System.Array]) { $indexObj = @($indexObj) }
                    
                    $timestamp = [Math]::Floor([decimal](Get-Date (Get-Date).ToUniversalTime() -UFormat "%s") * 1000)
                    foreach ($item in $indexObj) {
                        if ($item.id -eq $id) { $item.lastModified = $timestamp; break }
                    }
                    Set-Content -Path $indexFile -Value ($indexObj | ConvertTo-Json -Depth 5 -Compress) -Encoding UTF8
                    
                    Send-Response $response 200 "application/json" '{"success":true}' $null
                }
                elseif ($request.HttpMethod -eq "PATCH" -and $id) {
                    # Rename board
                    $bodyRaw = Get-RequestBody $request
                    $bodyObj = $bodyRaw | ConvertFrom-Json
                    
                    $indexStr = Get-Content -Path $indexFile -Raw -Encoding UTF8
                    $indexObj = $indexStr | ConvertFrom-Json
                    if ($null -eq $indexObj) { $indexObj = @() }
                    if ($indexObj -isnot [System.Array]) { $indexObj = @($indexObj) }
                    
                    foreach ($item in $indexObj) {
                        if ($item.id -eq $id) { $item.name = $bodyObj.name; break }
                    }
                    Set-Content -Path $indexFile -Value ($indexObj | ConvertTo-Json -Depth 5 -Compress) -Encoding UTF8
                    
                    Send-Response $response 200 "application/json" '{"success":true}' $null
                }
                elseif ($request.HttpMethod -eq "DELETE" -and $id) {
                    # Xóa board
                    $dataFile = "$boardsDir\$id.json"
                    if (Test-Path $dataFile) { Remove-Item -Path $dataFile -Force }
                    
                    $indexStr = Get-Content -Path $indexFile -Raw -Encoding UTF8
                    $indexObj = $indexStr | ConvertFrom-Json
                    if ($null -eq $indexObj) { $indexObj = @() }
                    if ($indexObj -isnot [System.Array]) { $indexObj = @($indexObj) }
                    
                    # Tạo array mới không chứa item bị xóa
                    $newArray = @()
                    foreach ($item in $indexObj) {
                        if ($item.id -ne $id) { $newArray += $item }
                    }
                    
                    Set-Content -Path $indexFile -Value ($newArray | ConvertTo-Json -Depth 5 -Compress) -Encoding UTF8
                    Send-Response $response 200 "application/json" '{"success":true}' $null
                }
                else {
                    Send-Response $response 405 "text/plain" "Method Not Allowed" $null
                }
            }
            # --- ROUTING STATIC FILES ---
            else {
                if ($urlPath -eq "/") { $urlPath = "/index.html" }
                
                # Giải mã URL (ví dụ: %20 -> khoảng trắng)
                $urlPathDecoded = [System.Uri]::UnescapeDataString($urlPath)
                
                # Nối đường dẫn an toàn
                $relativePath = $urlPathDecoded.Replace("/", "\").TrimStart('\')
                $filePath = Join-Path -Path $clientDir -ChildPath $relativePath
                
                if (Test-Path $filePath -PathType Leaf) {
                    $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                    $contentType = switch ($ext) {
                        ".html" { "text/html; charset=utf-8" }
                        ".css"  { "text/css; charset=utf-8" }
                        ".js"   { "application/javascript; charset=utf-8" }
                        ".json" { "application/json; charset=utf-8" }
                        ".png"  { "image/png" }
                        ".jpg"  { "image/jpeg" }
                        ".svg"  { "image/svg+xml" }
                        default { "application/octet-stream" }
                    }
                    
                    # Đọc nhị phân xử lý text và file ảnh - KHÔNG thay đổi UTF8
                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    Send-Response $response 200 $contentType $null $bytes
                } else {
                    Write-Host "404 Not Found: $filePath" -ForegroundColor Yellow
                    Send-Response $response 404 "text/plain" "File Not Found" $null
                }
            }
        } catch {
            Write-Host "Error: $_" -ForegroundColor Red
            Send-Response $response 500 "text/plain" "Internal Server Error" $null
        }
    }
} finally {
    $listener.Stop()
}
