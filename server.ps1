# 英语语法练习 - 内置服务器 (无需安装任何东西)
# 用法: 右键此文件 → "使用 PowerShell 运行"

$PORT = 8080
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path

$mime = @{
    '.html' = 'text/html; charset=utf-8'
    '.css'  = 'text/css; charset=utf-8'
    '.js'   = 'application/javascript; charset=utf-8'
    '.json' = 'application/json; charset=utf-8'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.svg'  = 'image/svg+xml'
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$PORT/")
$listener.Start()

Write-Host "========================================" -ForegroundColor Green
Write-Host "  英语语法练习服务器已启动" -ForegroundColor Green
Write-Host "  浏览器打开: http://localhost:$PORT" -ForegroundColor Cyan
Write-Host "  关闭此窗口停止服务器" -ForegroundColor Gray
Write-Host "========================================" -ForegroundColor Green

Start-Process "http://localhost:$PORT"

while ($listener.IsListening) {
    try {
        $ctx = $listener.GetContext()
        $req = $ctx.Request
        $resp = $ctx.Response
        $path = $req.Url.AbsolutePath

        # API proxy: /api/generate → DeepSeek
        if ($path -eq '/api/generate' -and $req.HttpMethod -eq 'POST') {
            $reader = New-Object System.IO.StreamReader($req.InputStream)
            $body = $reader.ReadToEnd()
            $reader.Close()

            $json = $body | ConvertFrom-Json
            $apiKey = if ($json.api_key) { $json.api_key } else { '' }
            $model  = if ($json.model)   { $json.model }   else { 'deepseek-chat' }
            $prompt = if ($json.prompt)  { $json.prompt }  else { '' }

            if (-not $apiKey) {
                $respBody = '{"error":"请先在设置中配置 DeepSeek API Key"}'
                $resp.StatusCode = 400
            } else {
                $reqBody = @{
                    model = $model
                    max_tokens = 4096
                    messages = @(@{ role = 'user'; content = $prompt })
                } | ConvertTo-Json -Compress -Depth 4

                try {
                    $wc = New-Object System.Net.WebClient
                    $wc.Headers.Add('Content-Type', 'application/json')
                    $wc.Headers.Add('Authorization', "Bearer $apiKey")
                    $result = $wc.UploadString('https://api.deepseek.com/v1/chat/completions', 'POST', $reqBody)
                    $resultJson = $result | ConvertFrom-Json
                    $text = $resultJson.choices[0].message.content
                    $respBody = (@{ text = $text } | ConvertTo-Json -Compress)
                    $resp.StatusCode = 200
                } catch [System.Net.WebException] {
                    $errResp = $_.Exception.Response
                    if ($errResp) {
                        $errReader = New-Object System.IO.StreamReader($errResp.GetResponseStream())
                        $errBody = $errReader.ReadToEnd()
                        $errReader.Close()
                        try {
                            $errJson = $errBody | ConvertFrom-Json
                            $errMsg = $errJson.error.message
                        } catch { $errMsg = "API 错误" }
                    } else { $errMsg = $_.Exception.Message }
                    $respBody = (@{ error = $errMsg } | ConvertTo-Json -Compress)
                    $resp.StatusCode = 500
                }
            }

            $bytes = [System.Text.Encoding]::UTF8.GetBytes($respBody)
            $resp.ContentType = 'application/json; charset=utf-8'
        }
        # Static files
        else {
            $filePath = if ($path -eq '/') { Join-Path $ROOT 'index.html' } else { Join-Path $ROOT ($path.TrimStart('/')) }

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath)
                $contentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { 'application/octet-stream' }
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $resp.ContentType = $contentType
                $resp.StatusCode = 200
            } else {
                # SPA fallback: serve index.html for unknown paths
                $htmlPath = Join-Path $ROOT 'index.html'
                if (Test-Path $htmlPath) {
                    $bytes = [System.IO.File]::ReadAllBytes($htmlPath)
                    $resp.ContentType = 'text/html; charset=utf-8'
                    $resp.StatusCode = 200
                } else {
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
                    $resp.StatusCode = 404
                }
            }
        }

        $resp.AddHeader('Access-Control-Allow-Origin', '*')
        $resp.AddHeader('Cache-Control', 'no-store')
        $resp.ContentLength64 = $bytes.Length
        $resp.OutputStream.Write($bytes, 0, $bytes.Length)
        $resp.OutputStream.Close()
    }
    catch {
        # Ignore disconnected clients
    }
}
