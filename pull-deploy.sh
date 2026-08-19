#!/bin/bash
# pull-deploy.sh - Jalankan di HOSTING setelah ada push baru
# Script ini akan membersihkan file build lama dan mengambil yang baru
# TANPA menghapus .env dan .htaccess
#
# Cara pakai: bash pull-deploy.sh

echo ""
echo "========================================"
echo "  MANDALA Hosting Pull & Deploy"
echo "========================================"
echo ""

# Simpan file yang perlu dilindungi
echo "[1/4] Menyimpan backup file hosting..."
PROTECTED_FILES=()

if [ -f ".env" ]; then
    cp .env .env.backup
    PROTECTED_FILES+=(".env")
    echo "  -> .env di-backup"
fi

if [ -f ".htaccess" ]; then
    cp .htaccess .htaccess.backup
    PROTECTED_FILES+=(".htaccess")
    echo "  -> .htaccess di-backup"
fi

if [ -f "dist/env-config.js" ]; then
    cp dist/env-config.js /tmp/env-config.js.backup
    PROTECTED_FILES+=("dist/env-config.js")
    echo "  -> dist/env-config.js di-backup"
fi

# Reset ke remote (ini akan menghapus file lama yang sudah tidak ada di repo)
echo "[2/4] Mengambil perubahan terbaru dari git..."
git fetch origin
BRANCH=$(git rev-parse --abbrev-ref HEAD)
git reset --hard "origin/$BRANCH"
echo "  -> Reset ke origin/$BRANCH berhasil"

# Kembalikan file yang dilindungi
echo "[3/4] Mengembalikan file hosting..."
if [ -f ".env.backup" ]; then
    mv .env.backup .env
    echo "  -> .env dikembalikan"
fi

if [ -f ".htaccess.backup" ]; then
    mv .htaccess.backup .htaccess
    echo "  -> .htaccess dikembalikan"
fi

if [ -f "/tmp/env-config.js.backup" ]; then
    mv /tmp/env-config.js.backup dist/env-config.js
    echo "  -> dist/env-config.js dikembalikan"
fi

# Verifikasi
echo "[4/4] Verifikasi..."
echo "  File JS di dist/assets/:"
ls -la dist/assets/*.js 2>/dev/null || echo "  (tidak ada file JS)"
echo ""
echo "  File CSS di dist/assets/:"
ls -la dist/assets/*.css 2>/dev/null || echo "  (tidak ada file CSS)"
echo ""

echo "========================================"
echo "  Deploy selesai!"
echo "========================================"
echo ""
echo "File yang dilindungi: ${PROTECTED_FILES[*]}"
echo ""
