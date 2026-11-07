# Choisis le code du mode developpeur du site.
# Le code est tape ici, dans cette fenetre : il n'est ecrit nulle part, seul dev.enc (chiffre) est publie.
# Lancer : clic droit sur ce fichier > Executer avec PowerShell
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
. "$PSScriptRoot\devcrypt.ps1"

function Read-Code([string]$prompt) {
    $s = Read-Host $prompt -AsSecureString
    $p = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($s)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($p) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($p) }
}

Write-Host ""
Write-Host "Code du mode developpeur du site Ak27" -ForegroundColor Cyan
Write-Host "Choisis un code long (12 caracteres ou plus) : c'est la seule protection du contenu."
$a = Read-Code "Nouveau code"
if ($a.Length -lt 12) { Write-Host "Trop court : 12 caracteres minimum." -ForegroundColor Red; Read-Host "Entree pour fermer"; exit 1 }
$b = Read-Code "Retape le code"
if ($a -ne $b) { Write-Host "Les deux codes ne sont pas pareils." -ForegroundColor Red; Read-Host "Entree pour fermer"; exit 1 }
Protect-DevContent ([Text.Encoding]::UTF8.GetBytes($a)) "$PSScriptRoot\dev.json" "$PSScriptRoot\dev.enc"
$a = $null; $b = $null
Write-Host "dev.enc mis a jour." -ForegroundColor Green

$git = Get-Command git -ErrorAction SilentlyContinue
if ($git -and (Read-Host "Publier sur le site maintenant ? (o/n)") -match '^[oOyY]') {
    git add dev.enc
    git commit -q -m "Update developer content" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
    git push -q
    Write-Host "Publie. Le site se met a jour dans une minute." -ForegroundColor Green
}
Read-Host "Entree pour fermer"
