# Windows 内置 OCR（Windows.Media.Ocr）封装：读一张图，输出带坐标的行/词 JSON。
#
# 用它而不是 tesseract 的原因：Win10 自带、离线、装了 zh-Hans-CN 语言包就能直接认中文，
# 不需要额外安装任何东西，也不用下载语言模型。
#
# 用法：
#   powershell -NoProfile -File scripts/lib/win-ocr.ps1 -Path <图片> [-Language zh-Hans-CN]
# 输出：{ "path": ..., "language": ..., "width": n, "height": n, "lines": [ { text, words:[{text,x,y,w,h}] } ] }

param(
  [Parameter(Mandatory = $true)][string]$Path,
  [string]$Language = 'zh-Hans-CN'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime | Out-Null

# WinRT 的异步方法在 PowerShell 里要手动转成 Task 再等待
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
})[0]

function Await($operation, $resultType) {
  $task = $asTaskGeneric.MakeGenericMethod($resultType).Invoke($null, @($operation))
  $task.Wait(-1) | Out-Null
  $task.Result
}

$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics.Imaging, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Globalization.Language, Windows.Foundation, ContentType = WindowsRuntime]

$full = (Resolve-Path -LiteralPath $Path).Path
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($full)) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

$lang = New-Object Windows.Globalization.Language($Language)
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
if ($null -eq $engine) {
  $available = ([Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | ForEach-Object { $_.LanguageTag }) -join ', '
  throw "系统没装 $Language 的 OCR 语言包。已装：$available"
}

$result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])

$lines = @()
foreach ($line in $result.Lines) {
  $words = @()
  foreach ($w in $line.Words) {
    $words += [ordered]@{
      text = $w.Text
      x = [int]$w.BoundingRect.X
      y = [int]$w.BoundingRect.Y
      w = [int]$w.BoundingRect.Width
      h = [int]$w.BoundingRect.Height
    }
  }
  $lines += [ordered]@{ text = $line.Text; words = $words }
}

$out = [ordered]@{
  path = $full
  language = $Language
  width = [int]$bitmap.PixelWidth
  height = [int]$bitmap.PixelHeight
  lines = $lines
}
$out | ConvertTo-Json -Depth 6 -Compress
