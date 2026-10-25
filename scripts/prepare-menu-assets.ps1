# Deterministic atlas slicing; run from any directory. No external dependencies.
Add-Type -AssemblyName System.Drawing
$menuRoot = Split-Path $PSScriptRoot -Parent
$menuSource = [System.Drawing.Bitmap]::new((Join-Path $menuRoot 'assets-source/ui/menus/meadow-materials.png'))
$menuOutput = Join-Path $menuRoot 'public/assets/ui/menus'
New-Item -ItemType Directory -Force -Path $menuOutput | Out-Null
$menuPatches = @(
  @{Name='linen'; X=65; Y=65; W=500; H=500; Size=192},
  @{Name='oak'; X=638; Y=24; W=594; H=590; Size=224},
  @{Name='stitched'; X=26; Y=630; W=594; H=590; Size=224},
  @{Name='sage'; X=638; Y=629; W=594; H=590; Size=224}
)
foreach ($menuPatch in $menuPatches) {
  $menuBitmap = [System.Drawing.Bitmap]::new($menuPatch.Size,$menuPatch.Size,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $menuGraphics = [System.Drawing.Graphics]::FromImage($menuBitmap)
  $menuGraphics.Clear([System.Drawing.Color]::Transparent)
  $menuGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $menuGraphics.DrawImage($menuSource,[System.Drawing.Rectangle]::new(0,0,$menuPatch.Size,$menuPatch.Size),[System.Drawing.Rectangle]::new($menuPatch.X,$menuPatch.Y,$menuPatch.W,$menuPatch.H),[System.Drawing.GraphicsUnit]::Pixel)
  $menuBitmap.Save((Join-Path $menuOutput ($menuPatch.Name+'.png')),[System.Drawing.Imaging.ImageFormat]::Png)
  $menuGraphics.Dispose(); $menuBitmap.Dispose()
}
$menuSource.Dispose()
$menuBytes = (Get-ChildItem -LiteralPath $menuOutput -File | Measure-Object Length -Sum).Sum
if ($menuBytes -gt 450000) { throw "Menu textures exceed budget: $menuBytes bytes" }
Write-Output "Served menu textures: $menuBytes bytes / 450000"
