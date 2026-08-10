// server.js - Production Node.js Server for cPanel (CloudLinux Passenger) & Realtime ENV
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;

// Otomatis deteksi letak folder build (bisa di ./dist atau langsung di root)
function getDistDirectory() {
  const possibleDist = path.join(__dirname, 'dist');
  if (fs.existsSync(possibleDist) && fs.existsSync(path.join(possibleDist, 'index.html'))) {
    return possibleDist;
  }
  return __dirname;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8'
};

// Fungsi membaca file .env dan Environment Variables cPanel secara REALTIME
function getRealtimeEnv() {
  const envData = { ...process.env };
  const envPath = path.join(__dirname, '.env');
  
  if (fs.existsSync(envPath)) {
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split(/\r?\n/).forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.substring(0, idx).trim();
          let val = trimmed.substring(idx + 1).trim();
          // Hapus kutip pembungkus jika ada
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          envData[key] = val;
        }
      });
    } catch (e) {
      console.error('[ENV Error]', e);
    }
  }

  return {
    VITE_API_URL: envData.VITE_API_URL || 'https://centralsimak.smakniscjr.sch.id/api',
    VITE_MANDALA_KEY: envData.VITE_MANDALA_KEY || ''
  };
}

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let safeUrl = decodeURIComponent(urlPath);
  const DIST_DIR = getDistDirectory();

  // 1. Endpoint Realtime ENV Config (Diambil langsung dari .env realtime pada setiap request)
  if (safeUrl === '/env-config.js' || safeUrl === '/env.js') {
    const env = getRealtimeEnv();
    const scriptContent = `window.__ENV__ = ${JSON.stringify(env, null, 2)};`;
    res.writeHead(200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(scriptContent, 'utf-8');
    return;
  }

  // 2. Storage Redirect Handler: Jika request diarahkan ke /storage di domain frontend, redirect ke Backend Storage
  if (safeUrl.startsWith('/storage/')) {
    const env = getRealtimeEnv();
    const backendBase = (env.VITE_API_URL || 'https://centralsimak.smakniscjr.sch.id/api').replace(/\/api\/?$/, '');
    const targetUrl = `${backendBase}${req.url}`;
    res.writeHead(302, { 'Location': targetUrl });
    res.end();
    return;
  }

  // 3. Health check endpoint untuk monitor uptime server
  if (safeUrl === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('OK');
    return;
  }

  // 3. Resolve lokasi static file
  let filePath = path.join(DIST_DIR, safeUrl);

  // Jika mengarah ke folder/direktori, cari index.html di dalamnya
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  // 4. Periksa apakah file ada secara fisik
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // Jika file aset tidak ditemukan, fallback ke index.html (SPA Fallback untuk React Router)
      filePath = path.join(DIST_DIR, 'index.html');
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head><title>500 Internal Server Error</title></head>
            <body style="font-family: sans-serif; padding: 40px; background: #0f172a; color: #f8fafc;">
              <h1 style="color: #ef4444;">500 Internal Server Error</h1>
              <p>File tidak dapat dibaca di: <code>${filePath}</code></p>
              <p>Pastikan Anda telah menjalankan <code>npm run build</code> dan folder <code>dist</code> terupload di direktori aplikasi.</p>
            </body>
          </html>
        `);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' 
          ? 'no-cache, no-store, must-revalidate' 
          : 'public, max-age=31536000, immutable'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`[SIMAK Server] Berjalan pada port ${PORT}`);
  console.log(`[SIMAK Server] Menyajikan file dari direktori: ${getDistDirectory()}`);
});
