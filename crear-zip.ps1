param(
    [string]$ZipName,
    [string]$SourcePath = "."
)

$excludeDirs = @('.git', '.opencode', '.agents', 'node_modules', 'dist', 'build', '.vs', '.vscode', 'test-zip*', 'test-fixed*', 'verify_zip*')
$excludeFiles = @('skills-lock.json', 'agents.md', 'INSTALACION.md', 'EJECUTAR.md', 'IMPORTACION.md', 'crear-zip.ps1', 'crear-zip-entrega.bat', 'Iniciar-Sistema.ps1', 'Extraer aqui')
$excludeExts = @('.log', '.tmp', '.zip')

$sourcePath = (Resolve-Path $SourcePath).Path

# Crear directorio temporal y copiar solo archivos permitidos
$tempDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "zip_source_" + [Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null

$allFiles = Get-ChildItem -Path $sourcePath -Recurse -File -ErrorAction SilentlyContinue

foreach ($file in $allFiles) {
    $skip = $false
    
    foreach ($dir in $excludeDirs) {
        $pattern = "\\" + ($dir -replace '\*', '.*') + "[\\/]"
        if ($file.FullName -match $pattern) {
            $skip = $true
            break
        }
    }
    if ($skip) { continue }
    
    if ($excludeFiles -contains $file.Name) { continue }
    if ($excludeExts -contains $file.Extension) { continue }
    
    # Calcular ruta relativa
    $relPath = $file.FullName.Substring($sourcePath.Length + 1)
    $destPath = Join-Path $tempDir $relPath
    
    # Crear directorio destino si no existe
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    
    Copy-Item $file.FullName -Destination $destPath -Force
}

Write-Host "Archivos copiados a directorio temporal: $tempDir"

# Comprimir desde el directorio temporal preservando estructura
Compress-Archive -Path "$tempDir\*" -DestinationPath $ZipName -Force -CompressionLevel Optimal

# Limpiar
Remove-Item $tempDir -Recurse -Force

Write-Host "ZIP creado: $ZipName"