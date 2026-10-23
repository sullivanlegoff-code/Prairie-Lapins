param([Parameter(Mandatory=$true)][string]$MasterImage)
# Post-process the generated adaptation only. Never touch the owner's reference.
Add-Type -AssemblyName System.Drawing
$sourceStone = [System.Drawing.Bitmap]::new((Resolve-Path -LiteralPath $MasterImage).Path)
$minStoneX = $sourceStone.Width; $minStoneY = $sourceStone.Height; $maxStoneX = 0; $maxStoneY = 0
for ($stoneY=0; $stoneY -lt $sourceStone.Height; $stoneY++) {
  for ($stoneX=0; $stoneX -lt $sourceStone.Width; $stoneX++) {
    if ($sourceStone.GetPixel($stoneX,$stoneY).A -gt 8) {
      $minStoneX=[Math]::Min($minStoneX,$stoneX); $maxStoneX=[Math]::Max($maxStoneX,$stoneX)
      $minStoneY=[Math]::Min($minStoneY,$stoneY); $maxStoneY=[Math]::Max($maxStoneY,$stoneY)
    }
  }
}
$stoneBounds = [System.Drawing.Rectangle]::new($minStoneX,$minStoneY,$maxStoneX-$minStoneX+1,$maxStoneY-$minStoneY+1)
$stoneOutput = Join-Path (Split-Path $PSScriptRoot -Parent) 'public/assets/ui'
New-Item -ItemType Directory -Force -Path $stoneOutput | Out-Null
foreach ($stoneKind in @('frame','grain')) {
  $stoneSize = if ($stoneKind -eq 'frame') {256} else {64}
  $stonePixels = if ($stoneKind -eq 'frame') {[System.Drawing.Imaging.PixelFormat]::Format32bppArgb} else {[System.Drawing.Imaging.PixelFormat]::Format24bppRgb}
  $stoneBitmap = [System.Drawing.Bitmap]::new($stoneSize,$stoneSize,$stonePixels)
  $stoneGraphics = [System.Drawing.Graphics]::FromImage($stoneBitmap)
  $stoneGraphics.Clear([System.Drawing.Color]::Transparent)
  $stoneGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $stonePatch = $stoneBounds
  if ($stoneKind -eq 'grain') {
    $stonePatch = [System.Drawing.Rectangle]::new([int]($minStoneX+$stoneBounds.Width*.45),[int]($minStoneY+$stoneBounds.Height*.075),[int]($stoneBounds.Width*.04),[int]($stoneBounds.Height*.04))
  }
  $stoneGraphics.DrawImage($sourceStone,[System.Drawing.Rectangle]::new(0,0,$stoneSize,$stoneSize),$stonePatch,[System.Drawing.GraphicsUnit]::Pixel)
  $stoneBitmap.Save((Join-Path $stoneOutput "stone-$stoneKind.png"),[System.Drawing.Imaging.ImageFormat]::Png)
  $stoneGraphics.Dispose(); $stoneBitmap.Dispose()
}
$sourceStone.Dispose()
Get-ChildItem -LiteralPath $stoneOutput | Select-Object Name,Length
