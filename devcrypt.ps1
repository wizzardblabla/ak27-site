# Chiffrement du mode developpeur du site (lu par app.js) :
# PBKDF2-SHA256 (cle de 64 octets) -> AES-256-CBC pour le contenu + HMAC-SHA256 sur iv+contenu.
function Protect-DevContent([byte[]]$CodeBytes, [string]$JsonPath, [string]$OutPath, [int]$Iterations = 310000) {
    $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
    $salt = New-Object byte[] 16; $rng.GetBytes($salt)
    $iv = New-Object byte[] 16; $rng.GetBytes($iv)
    $kdf = New-Object Security.Cryptography.Rfc2898DeriveBytes($CodeBytes, $salt, $Iterations, [Security.Cryptography.HashAlgorithmName]::SHA256)
    $keys = $kdf.GetBytes(64); $kdf.Dispose()
    $encKey = $keys[0..31]; $macKey = $keys[32..63]
    $aes = [Security.Cryptography.Aes]::Create()
    $aes.Mode = 'CBC'; $aes.Padding = 'PKCS7'; $aes.Key = $encKey; $aes.IV = $iv
    $plain = [IO.File]::ReadAllBytes($JsonPath)
    $ct = $aes.CreateEncryptor().TransformFinalBlock($plain, 0, $plain.Length); $aes.Dispose()
    $hmac = New-Object Security.Cryptography.HMACSHA256(,[byte[]]$macKey)
    $mac = $hmac.ComputeHash([byte[]]($iv + $ct)); $hmac.Dispose()
    [Array]::Clear($keys, 0, $keys.Length)
    $out = [ordered]@{ v = 1; iter = $Iterations; salt = [Convert]::ToBase64String($salt); iv = [Convert]::ToBase64String($iv); ct = [Convert]::ToBase64String($ct); mac = [Convert]::ToBase64String($mac) }
    [IO.File]::WriteAllText($OutPath, ($out | ConvertTo-Json -Compress), (New-Object Text.UTF8Encoding $false))
}
