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
function Write-JsonSafe($path, $contentStr) {
    $r = 0; $done = $false
    while (-not $done -and $r -lt 10) {
        try {
            [System.IO.File]::WriteAllText($path, $contentStr, [System.Text.Encoding]::UTF8)
            $done = $true
        } catch { $r++; Start-Sleep -Milliseconds 50 }
    }
    if (-not $done) { Write-Host "Write Error on $path : $($_.Exception.Message)" -ForegroundColor Red }
}

function Read-JsonSafe($path) {
    if (-not (Test-Path $path)) { return $null }
    $r = 0; $res = $null
    while ($r -lt 10) {
        try {
            $res = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
            break
        } catch { $r++; Start-Sleep -Milliseconds 50 }
    }
    return $res
}

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
            # --- SELF HEALING: Tự chữa lành Database nếu bị xóa nóng lúc server đang chạy ---
            if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Force -Path $dataDir | Out-Null }
            if (!(Test-Path $boardsDir)) { New-Item -ItemType Directory -Force -Path $boardsDir | Out-Null }
            if (!(Test-Path $indexFile)) { Write-JsonSafe $indexFile "[]" }

            # --- ROUTING CHO API ---
            if ($urlPath -match "^/api/boards") {
                $id = $null
                # Regex bắt id ở cuối: /api/boards/xxxx
                if ($urlPath -match "^/api/boards/([^/]+)$") {
                    $id = $matches[1]
                }

                if ($request.HttpMethod -eq "GET" -and -not $id) {
                    # Lấy danh sách boards
                    $indexStr = Read-JsonSafe $indexFile
                    Send-Response $response 200 "application/json" $indexStr $null
                }
                elseif ($request.HttpMethod -eq "POST" -and -not $id) {
                    # Tạo board mới
                    $bodyRaw = Get-RequestBody $request
                    $bodyObj = $bodyRaw | ConvertFrom-Json
                    
                    # Đọc index hiện tại
                    $indexStr = Read-JsonSafe $indexFile
                    $indexObj = $indexStr | ConvertFrom-Json
                    
                    if ($null -eq $indexObj) { $tempArray = [object[]]@() }
                    elseif ($indexObj -is [System.Array]) { $tempArray = [object[]]$indexObj }
                    else { $tempArray = [object[]]@($indexObj) }

                    $newId = [guid]::NewGuid().ToString().Substring(0, 8)
                    # Lấy Timestamp milliseconds
                    $timestamp = [Math]::Floor([decimal](Get-Date (Get-Date).ToUniversalTime() -UFormat "%s") * 1000)
                    
                    $newBoard = @{
                        id = $newId
                        name = $bodyObj.name
                        lastModified = $timestamp
                    }
                    $tempArray += $newBoard
                    
                    # Convert object back to array JSON LƯU Ý 1: bảo vệ UTF8
                    $newIndexStr = ConvertTo-Json -InputObject $tempArray -Depth 5 -Compress
                    Write-JsonSafe $indexFile $newIndexStr
                    
                    # Khởi tạo data board file rỗng "[]"
                    Write-JsonSafe "$boardsDir\$newId.json" "[]"
                    
                    Send-Response $response 201 "application/json" ($newBoard | ConvertTo-Json -Compress) $null
                }
                elseif ($request.HttpMethod -eq "GET" -and $id) {
                    # Đọc nội dung board
                    $dataFile = "$boardsDir\$id.json"
                    if (Test-Path $dataFile) {
                        $dataStr = Read-JsonSafe $dataFile
                        Send-Response $response 200 "application/json" $dataStr $null
                    } else {
                        Send-Response $response 404 "application/json" '{"error":"Board not found"}' $null
                    }
                }
                elseif ($request.HttpMethod -eq "PUT" -and $id) {
                    # Ghi nội dung board (DÙNG RAW STRING để tránh lỗi ConvertFrom-Json bị giới hạn và lỗi ép type)
                    $bodyRaw = Get-RequestBody $request
                    $dataFile = "$boardsDir\$id.json"
                    $tmpFile = "$boardsDir\$id.tmp.json"
                    
                    # Shadow Copy: Ghi nháp ra file temp, nếu thành công mới replace file gốc
                    Write-JsonSafe $tmpFile $bodyRaw
                    # Dùng Retry Loop cho File Replace luôn vì đôi khi Defender lock move-item
                    $m=0; $md=$false
                    while(-not $md -and $m -lt 10) {
                        try { Move-Item -Path $tmpFile -Destination $dataFile -Force; $md=$true }
                        catch { $m++; Start-Sleep -Milliseconds 50 }
                    }
                    
                    # Update index modified time
                    $indexStr = Read-JsonSafe $indexFile
                    $indexObj = $indexStr | ConvertFrom-Json
                    
                    if ($null -eq $indexObj) { $indexObj = [object[]]@() }
                    elseif ($indexObj -is [System.Array]) { $indexObj = [object[]]$indexObj }
                    else { $indexObj = [object[]]@($indexObj) }
                    
                    $timestamp = [Math]::Floor([decimal](Get-Date (Get-Date).ToUniversalTime() -UFormat "%s") * 1000)
                    foreach ($item in $indexObj) {
                        if ($item.id -eq $id) { $item.lastModified = $timestamp; break }
                    }
                    Write-JsonSafe $indexFile (ConvertTo-Json -InputObject $indexObj -Depth 5 -Compress)
                    
                    Send-Response $response 200 "application/json" '{"success":true}' $null
                }
                elseif ($request.HttpMethod -eq "PATCH" -and $id) {
                    # Rename board
                    $bodyRaw = Get-RequestBody $request
                    $bodyObj = $bodyRaw | ConvertFrom-Json
                    
                    $indexStr = Read-JsonSafe $indexFile
                    $indexObj = $indexStr | ConvertFrom-Json
                    
                    if ($null -eq $indexObj) { $indexObj = [object[]]@() }
                    elseif ($indexObj -is [System.Array]) { $indexObj = [object[]]$indexObj }
                    else { $indexObj = [object[]]@($indexObj) }
                    
                    foreach ($item in $indexObj) {
                        if ($item.id -eq $id) { $item.name = $bodyObj.name; break }
                    }
                    Write-JsonSafe $indexFile (ConvertTo-Json -InputObject $indexObj -Depth 5 -Compress)
                    
                    Send-Response $response 200 "application/json" '{"success":true}' $null
                }
                elseif ($request.HttpMethod -eq "DELETE" -and $id) {
                    # Xóa board VÀ Dọn dẹp mảng ảnh (Garbage Collector) bằng System.IO
                    $dataFile = "$boardsDir\$id.json"
                    if (Test-Path $dataFile) {
                        try {
                            # Đọc text bằng .NET để nhả Handle tức thì
                            $bData = [System.IO.File]::ReadAllText($dataFile)
                            if ($bData) {
                                $matches = [regex]::Matches($bData, '"(?:src|url)"\s*:\s*"[^"]*/images/([^"]+)"')
                                foreach ($match in $matches) {
                                    $imgName = $match.Groups[1].Value
                                    $imgPath = "$dataDir\images\$imgName"
                                    if (Test-Path $imgPath) { 
                                        $rImg = 0; $dImg = $false
                                        while (-not $dImg -and $rImg -lt 10) {
                                            try { [System.IO.File]::Delete($imgPath); $dImg = $true } 
                                            catch { $rImg++; Start-Sleep -Milliseconds 50 }
                                        }
                                    }
                                }
                            }
                        } catch {}
                        
                        $retryCount = 0
                        $maxRetries = 10
                        $deleted = $false
                        while (-not $deleted -and $retryCount -lt $maxRetries) {
                            try {
                                [System.IO.File]::Delete($dataFile)
                                $deleted = $true
                            } catch { 
                                $retryCount++
                                if ($retryCount -ge $maxRetries) {
                                    Write-Host "FAILED TO DELETE JSON ($dataFile): $($_.Exception.Message)" -ForegroundColor Red 
                                } else {
                                    Start-Sleep -Milliseconds 50
                                }
                            }
                        }
                    }
                    
                    # Dọn dẹp cả file Hot Exit rác nếu có
                    $tmpFile = "$boardsDir\$id.tmp.json"
                    if (Test-Path $tmpFile) {
                        try { [System.IO.File]::Delete($tmpFile) } catch {}
                    }
                    
                    $indexStr = Get-Content -Path $indexFile -Raw -Encoding UTF8
                    $indexObj = $indexStr | ConvertFrom-Json
                    
                    if ($null -eq $indexObj) { $indexObj = [object[]]@() }
                    elseif ($indexObj -is [System.Array]) { $indexObj = [object[]]$indexObj }
                    else { $indexObj = [object[]]@($indexObj) }
                    
                    # Tạo array mới không chứa item bị xóa
                    $newArray = [object[]]@()
                    foreach ($item in $indexObj) {
                        if ($item.id -ne $id) { $newArray += $item }
                    }
                    
                    Write-JsonSafe $indexFile (ConvertTo-Json -InputObject $newArray -Depth 5 -Compress)
                    Send-Response $response 200 "application/json" '{"success":true}' $null
                }
                else {
                    Send-Response $response 405 "text/plain" "Method Not Allowed" $null
                }
            }
            elseif ($request.HttpMethod -eq "POST" -and $urlPath -eq "/api/images") {
                # Upload ảnh độc lập
                $imagesDir = "$dataDir\images"
                if (!(Test-Path $imagesDir)) { New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null }
                
                $newId = [guid]::NewGuid().ToString().Substring(0, 8)
                $fileName = "img_$newId.png"
                $filePath = "$imagesDir\$fileName"
                
                # Đọc mảng bytes từ HTTP Request và ghi vào ổ đĩa
                if ($request.HasEntityBody) {
                    $stream = $request.InputStream
                    $fileStream = [System.IO.File]::Create($filePath)
                    $stream.CopyTo($fileStream)
                    $fileStream.Close()
                    $stream.Close()
                }
                
                $result = @{ url = "/images/$fileName" }
                Send-Response $response 201 "application/json" ($result | ConvertTo-Json -Compress) $null
            }
            # --- ROUTING STATIC FILES ---
            else {
                if ($urlPath -eq "/") { $urlPath = "/index.html" }
                
                # Giải mã URL (ví dụ: %20 -> khoảng trắng)
                $urlPathDecoded = [System.Uri]::UnescapeDataString($urlPath)
                $relativePath = $urlPathDecoded.Replace("/", "\").TrimStart('\')
                
                # Nối đường dẫn an toàn
                if ($urlPathDecoded -match "^/images/") {
                    $imagesDir = "$dataDir\images"
                    $fileName = Split-Path $relativePath -Leaf
                    $filePath = Join-Path -Path $imagesDir -ChildPath $fileName
                } else {
                    $filePath = Join-Path -Path $clientDir -ChildPath $relativePath
                }
                
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
