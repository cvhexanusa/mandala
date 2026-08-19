# deploy.ps1 - Script deploy untuk membersihkan build lama dan push build baru
# File yang DILINDUNGI di hosting: .env, .htaccess, env-config.js
# Jalankan: .\deploy.ps1 atau .\deploy.ps1 -Message "pesan commit"

param(
    [string]$Message = "update build"
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  MANDALA Deploy Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Hapus file JS/CSS lama dari git tracking di dist/assets/
Write-Host "[1/5] Membersihkan file build lama dari git..." -ForegroundColor Yellow
$oldAssets = git ls-files "dist/assets/"
if ($oldAssets) {
    git rm --cached -r "dist/assets/" 2>$null
    Write-Host "  -> File lama di dist/assets/ dihapus dari git tracking" -ForegroundColor Gray
} else {
    Write-Host "  -> Tidak ada file lama di dist/assets/" -ForegroundColor Gray
}

# 2. Hapus folder dist/assets/ secara fisik agar build bersih
Write-Host "[2/5] Membersihkan folder dist/assets/ lokal..." -ForegroundColor Yellow
if (Test-Path "dist/assets") {
    Remove-Item -Recurse -Force "dist/assets"
    Write-Host "  -> dist/assets/ dihapus" -ForegroundColor Gray
}

# 3. Build ulang
Write-Host "[3/5] Menjalankan npm run build..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [ERROR] Build gagal! Deploy dibatalkan." -ForegroundColor Red
    exit 1
}
Write-Host "  -> Build berhasil" -ForegroundColor Green

# 4. Pastikan env-config.js fallback ada (tidak akan menimpa yang di hosting karena server.js generate realtime)
$envConfigPath = "dist/env-config.js"
if (-not (Test-Path $envConfigPath)) {
    Write-Host "  -> Membuat env-config.js fallback..." -ForegroundColor Gray
    @"
// Fallback runtime env configuration (Digenerate realtime oleh server.js saat production di cPanel)
window.__ENV__ = window.__ENV__ || {
  VITE_API_URL: "https://centralsimak.smakniscjr.sch.id/api",
  VITE_MANDALA_KEY: ""
};
"@ | Set-Content -Path $envConfigPath -Encoding UTF8
}

# 5. Git add, commit, push
Write-Host "[4/5] Menambahkan file build baru ke git..." -ForegroundColor Yellow
git add dist/
git add -A
Write-Host "  -> File baru ditambahkan" -ForegroundColor Gray

Write-Host "[5/5] Commit dan push..." -ForegroundColor Yellow
git commit -m $Message
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [INFO] Tidak ada perubahan untuk di-commit" -ForegroundColor Gray
} else {
    git push
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [ERROR] Push gagal!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  -> Push berhasil!" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy selesai!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Langkah selanjutnya di HOSTING:" -ForegroundColor Cyan
Write-Host "  1. SSH ke hosting" -ForegroundColor White
Write-Host "  2. cd ke direktori project" -ForegroundColor White
Write-Host "  3. Jalankan: git fetch origin && git reset --hard origin/main" -ForegroundColor White
Write-Host "     (ini akan menghapus file JS lama dan mengambil yang baru)" -ForegroundColor Gray
Write-Host ""
Write-Host "[!] File .env dan .htaccess di hosting AMAN karena:" -ForegroundColor Yellow
Write-Host "    - .env ada di .gitignore (tidak di-track git)" -ForegroundColor Gray
Write-Host "    - .htaccess di root BUKAN di dalam dist/" -ForegroundColor Gray
Write-Host ""
