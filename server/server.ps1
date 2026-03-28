$port = 2502
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
try { $listener.IgnoreWriteExceptions = $true } catch {}
$listener.Start()

$serverDir = $PSScriptRoot
$clientDir = Resolve-Path "$serverDir\..\client"
$dataDir = "$serverDir\data"
$boardsDir = "$dataDir\boards"
$indexFile = "$dataDir\index.json"

if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Force -Path $dataDir | Out-Null }
if (!(Test-Path $boardsDir)) { New-Item -ItemType Directory -Force -Path $boardsDir | Out-Null }
if (!(Test-Path $indexFile)) { Set-Content -Path $indexFile -Value "[]" -Encoding UTF8 }

Write-Host "Server running at http://localhost:$port/" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop."

function Get-UnixTimeMs() {
    return [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
}

function Write-JsonSafe($path, $contentStr) {
    $r = 0
    $done = $false
    while (-not $done -and $r -lt 10) {
        try {
            [System.IO.File]::WriteAllText($path, $contentStr, [System.Text.Encoding]::UTF8)
            $done = $true
        } catch {
            $r++
            Start-Sleep -Milliseconds 50
        }
    }

    if (-not $done) {
        Write-Host "Write Error on $path : $($_.Exception.Message)" -ForegroundColor Red
    }
}

function Read-JsonSafe($path) {
    if (-not (Test-Path $path)) { return $null }

    $r = 0
    $res = $null
    while ($r -lt 10) {
        try {
            $res = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
            break
        } catch {
            $r++
            Start-Sleep -Milliseconds 50
        }
    }

    return $res
}

function Normalize-ToArray($value) {
    if ($null -eq $value) { return , [object[]]@() }
    if ($value -is [System.Array]) { return , [object[]]$value }
    return , [object[]]@($value)
}

function Test-ClientDisconnectException($ex) {
    if ($null -eq $ex) { return $false }

    $messages = New-Object System.Collections.Generic.List[string]
    $current = $ex
    while ($null -ne $current) {
        $messages.Add($current.GetType().FullName)
        if ($current.Message) { $messages.Add($current.Message) }
        $current = $current.InnerException
    }

    $joined = $messages -join " | "
    return (
        $joined -match "HttpListenerException" -or
        $joined -match "ObjectDisposedException" -or
        $joined -match "The I/O operation has been aborted" -or
        $joined -match "Unable to write data to the transport connection" -or
        $joined -match "An existing connection was forcibly closed" -or
        $joined -match "The specified network name is no longer available" -or
        $joined -match "Cannot access a disposed object"
    )
}

function Close-ResponseQuietly($response) {
    if ($null -eq $response) { return }

    try {
        if ($null -ne $response.OutputStream) {
            $response.OutputStream.Close()
        }
    } catch {}

    try {
        $response.Close()
    } catch {}
}

function Send-Response($response, $statusCode, $contentType, $contentStr, $contentBytes) {
    if ($null -eq $response) { return }

    try {
        $response.StatusCode = $statusCode
        $response.ContentType = $contentType
        $response.AppendHeader("Access-Control-Allow-Origin", "*")
        $response.AppendHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
        $response.AppendHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($contentBytes -ne $null) {
            $response.ContentLength64 = $contentBytes.Length
            $response.OutputStream.Write($contentBytes, 0, $contentBytes.Length)
        } elseif ($contentStr -ne $null) {
            $utf8NoBom = New-Object System.Text.UTF8Encoding $false
            $buffer = $utf8NoBom.GetBytes($contentStr)
            $response.ContentLength64 = $buffer.Length
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
        }
    } catch {
        if (Test-ClientDisconnectException $_.Exception) {
            Write-Host "Client disconnected while sending response." -ForegroundColor DarkYellow
        } else {
            Write-Host "Response Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    } finally {
        Close-ResponseQuietly $response
    }
}

function Get-RequestBody($request) {
    if (-not $request.HasEntityBody) { return "" }

    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
    try {
        return $reader.ReadToEnd()
    } finally {
        $reader.Close()
    }
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
        } catch {
            if (-not $listener.IsListening) { break }

            if (Test-ClientDisconnectException $_.Exception) {
                Write-Host "Ignored dropped request while accepting connection." -ForegroundColor DarkYellow
            } else {
                Write-Host "Listener Error: $($_.Exception.Message)" -ForegroundColor Red
                Start-Sleep -Milliseconds 100
            }
            continue
        }

        $request = $context.Request
        $response = $context.Response
        $urlPath = $request.Url.LocalPath

        if ($request.HttpMethod -eq "OPTIONS") {
            Send-Response $response 200 "text/plain" "" $null
            continue
        }

        try {
            if (!(Test-Path $dataDir)) { New-Item -ItemType Directory -Force -Path $dataDir | Out-Null }
            if (!(Test-Path $boardsDir)) { New-Item -ItemType Directory -Force -Path $boardsDir | Out-Null }
            if (!(Test-Path $indexFile)) { Write-JsonSafe $indexFile "[]" }

            if ($urlPath -match "^/api/boards") {
                $id = $null
                if ($urlPath -match "^/api/boards/([^/]+)$") {
                    $id = $matches[1]
                }

                if ($request.HttpMethod -eq "GET" -and -not $id) {
                    $indexStr = Read-JsonSafe $indexFile
                    Send-Response $response 200 "application/json" $indexStr $null
                }
                elseif ($request.HttpMethod -eq "POST" -and -not $id) {
                    $bodyRaw = Get-RequestBody $request
                    $bodyObj = $bodyRaw | ConvertFrom-Json

                    $indexStr = Read-JsonSafe $indexFile
                    $indexObj = Normalize-ToArray ($indexStr | ConvertFrom-Json)

                    $newId = [guid]::NewGuid().ToString().Substring(0, 8)
                    $timestamp = Get-UnixTimeMs
                    $newBoard = @{
                        id = $newId
                        name = $bodyObj.name
                        lastModified = $timestamp
                    }

                    $indexObj += $newBoard
                    Write-JsonSafe $indexFile (ConvertTo-Json -InputObject $indexObj -Depth 5 -Compress)
                    Write-JsonSafe "$boardsDir\$newId.json" "[]"

                    Send-Response $response 201 "application/json" ($newBoard | ConvertTo-Json -Compress) $null
                }
                elseif ($request.HttpMethod -eq "GET" -and $id) {
                    $dataFile = "$boardsDir\$id.json"
                    if (Test-Path $dataFile) {
                        $dataStr = Read-JsonSafe $dataFile
                        Send-Response $response 200 "application/json" $dataStr $null
                    } else {
                        Send-Response $response 404 "application/json" '{"error":"Board not found"}' $null
                    }
                }
                elseif ($request.HttpMethod -eq "PUT" -and $id) {
                    $bodyRaw = Get-RequestBody $request
                    $dataFile = "$boardsDir\$id.json"
                    $tmpFile = "$boardsDir\$id.tmp.json"

                    Write-JsonSafe $tmpFile $bodyRaw

                    $m = 0
                    $moved = $false
                    while (-not $moved -and $m -lt 10) {
                        try {
                            Move-Item -Path $tmpFile -Destination $dataFile -Force
                            $moved = $true
                        } catch {
                            $m++
                            Start-Sleep -Milliseconds 50
                        }
                    }

                    $indexStr = Read-JsonSafe $indexFile
                    $indexObj = Normalize-ToArray ($indexStr | ConvertFrom-Json)
                    $timestamp = Get-UnixTimeMs
                    foreach ($item in $indexObj) {
                        if ($item.id -eq $id) {
                            $item.lastModified = $timestamp
                            break
                        }
                    }

                    Write-JsonSafe $indexFile (ConvertTo-Json -InputObject $indexObj -Depth 5 -Compress)
                    Send-Response $response 200 "application/json" '{"success":true}' $null
                }
                elseif ($request.HttpMethod -eq "PATCH" -and $id) {
                    $bodyRaw = Get-RequestBody $request
                    $bodyObj = $bodyRaw | ConvertFrom-Json

                    $indexStr = Read-JsonSafe $indexFile
                    $indexObj = Normalize-ToArray ($indexStr | ConvertFrom-Json)
                    foreach ($item in $indexObj) {
                        if ($item.id -eq $id) {
                            $item.name = $bodyObj.name
                            break
                        }
                    }

                    Write-JsonSafe $indexFile (ConvertTo-Json -InputObject $indexObj -Depth 5 -Compress)
                    Send-Response $response 200 "application/json" '{"success":true}' $null
                }
                elseif ($request.HttpMethod -eq "DELETE" -and $id) {
                    $dataFile = "$boardsDir\$id.json"
                    if (Test-Path $dataFile) {
                        try {
                            $bData = [System.IO.File]::ReadAllText($dataFile)
                            if ($bData) {
                                $matches = [regex]::Matches($bData, '"(?:src|url)"\s*:\s*"[^"]*/images/([^"]+)"')
                                foreach ($match in $matches) {
                                    $imgName = $match.Groups[1].Value
                                    $imgPath = "$dataDir\images\$imgName"
                                    if (Test-Path $imgPath) {
                                        $rImg = 0
                                        $deletedImg = $false
                                        while (-not $deletedImg -and $rImg -lt 10) {
                                            try {
                                                [System.IO.File]::Delete($imgPath)
                                                $deletedImg = $true
                                            } catch {
                                                $rImg++
                                                Start-Sleep -Milliseconds 50
                                            }
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

                    $tmpFile = "$boardsDir\$id.tmp.json"
                    if (Test-Path $tmpFile) {
                        try { [System.IO.File]::Delete($tmpFile) } catch {}
                    }

                    $indexStr = Get-Content -Path $indexFile -Raw -Encoding UTF8
                    $indexObj = Normalize-ToArray ($indexStr | ConvertFrom-Json)

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
                $imagesDir = "$dataDir\images"
                if (!(Test-Path $imagesDir)) { New-Item -ItemType Directory -Force -Path $imagesDir | Out-Null }

                $newId = [guid]::NewGuid().ToString().Substring(0, 8)
                $fileName = "img_$newId.png"
                $filePath = "$imagesDir\$fileName"

                if ($request.HasEntityBody) {
                    $stream = $request.InputStream
                    $fileStream = [System.IO.File]::Create($filePath)
                    try {
                        $stream.CopyTo($fileStream)
                    } finally {
                        $fileStream.Close()
                        $stream.Close()
                    }
                }

                $result = @{ url = "/images/$fileName" }
                Send-Response $response 201 "application/json" ($result | ConvertTo-Json -Compress) $null
            }
            else {
                if ($urlPath -eq "/") { $urlPath = "/index.html" }

                $urlPathDecoded = [System.Uri]::UnescapeDataString($urlPath)
                $relativePath = $urlPathDecoded.Replace("/", "\").TrimStart('\')

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

                    $bytes = [System.IO.File]::ReadAllBytes($filePath)
                    Send-Response $response 200 $contentType $null $bytes
                } else {
                    Write-Host "404 Not Found: $filePath" -ForegroundColor Yellow
                    Send-Response $response 404 "text/plain" "File Not Found" $null
                }
            }
        } catch {
            if (Test-ClientDisconnectException $_.Exception) {
                Write-Host "Client disconnected during request: $urlPath" -ForegroundColor DarkYellow
            } else {
                Write-Host "Error: $_" -ForegroundColor Red
            }
            Send-Response $response 500 "text/plain" "Internal Server Error" $null
        }
    }
} finally {
    try { $listener.Stop() } catch {}
}
