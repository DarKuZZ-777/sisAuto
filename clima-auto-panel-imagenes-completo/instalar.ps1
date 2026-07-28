$ErrorActionPreference = "Stop"
$Origen = Split-Path -Parent $MyInvocation.MyCommand.Path
$Destino = "C:\Users\EliteBook\Desktop\clima-auto"
$Fecha = Get-Date -Format "yyyyMMdd-HHmmss"
$Respaldo = "C:\Users\EliteBook\Desktop\clima-auto-respaldo-$Fecha"
Write-Host "Clima Auto - instalador completo de imágenes" -ForegroundColor Cyan
if (Test-Path $Destino) {
  Write-Host "Creando respaldo: $Respaldo"
  Copy-Item $Destino $Respaldo -Recurse -Force
}
if (-not (Test-Path $Destino)) { New-Item -ItemType Directory -Path $Destino | Out-Null }
Get-ChildItem $Destino -Force | Remove-Item -Recurse -Force
Get-ChildItem $Origen -Force | Where-Object { $_.Name -ne "instalar.ps1" } | Copy-Item -Destination $Destino -Recurse -Force
Write-Host "Proyecto instalado correctamente en $Destino" -ForegroundColor Green
Write-Host "Abrí index.html con Live Server y luego admin/login.html" -ForegroundColor Yellow
