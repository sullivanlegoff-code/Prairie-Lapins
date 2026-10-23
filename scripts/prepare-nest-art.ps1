param([Parameter(Mandatory=$true)][string]$Source)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
# Crop only the generated master, never the owner's reference or previous texture.
# Uniform 2/3 reduction: 1056 x 1215 -> 704 x 810. Ground is bottom 704 x 592.
$sourceBitmap = [System.Drawing.Bitmap]::FromFile((Resolve-Path -LiteralPath $Source))
try {
    if ($sourceBitmap.Width -ne 1122 -or $sourceBitmap.Height -ne 1402) { throw 'Unexpected generated master size' }
    $crop = $sourceBitmap.Clone([System.Drawing.Rectangle]::new(36,80,1056,1215), [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $target = [System.Drawing.Bitmap]::new(704,810,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($target)
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $attributes = [System.Drawing.Imaging.ImageAttributes]::new()
    $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    $graphics.DrawImage($crop,[System.Drawing.Rectangle]::new(0,0,704,810),0,0,1056,1215,[System.Drawing.GraphicsUnit]::Pixel,$attributes)
    $graphics.Dispose(); $attributes.Dispose(); $crop.Dispose()
    # Imagegen leaves a slight translucency even inside painted grass. Make the
    # registered ground opaque; retain original alpha on all elevated silhouettes.
    # This changes opacity only, never paints or stretches architecture/details.
    for ($y=218; $y -lt 810; $y++) {
        for ($x=0; $x -lt 704; $x++) {
            $pixel=$target.GetPixel($x,$y)
            if ($pixel.A -lt 180) { throw "Ground gap in generated art at $x,$y" }
            $target.SetPixel($x,$y,[System.Drawing.Color]::FromArgb(255,$pixel.R,$pixel.G,$pixel.B))
        }
    }
    $destination=Join-Path $PSScriptRoot '../public/assets/buildings/nest-garden-v2.png'
    $target.Save([System.IO.Path]::GetFullPath($destination),[System.Drawing.Imaging.ImageFormat]::Png)
    $target.Dispose()
} finally { $sourceBitmap.Dispose() }
