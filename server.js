// server.js (Zero-dependency Node.js server for serving built Vite SPA)
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
  // Decode URI to handle spaces/special characters
  let safeUrl = decodeURIComponent(req.url.split('?')[0]);
  
  // Resolve path
  let filePath = path.join(DIST_DIR, safeUrl);

  // If path is a directory, look for index.html inside it
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {
    // Stat error, fallback to index.html
    filePath = path.join(DIST_DIR, 'index.html');
  }

  // Check if file exists and is not a directory
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // File does not exist, serve index.html (SPA Fallback)
      filePath = path.join(DIST_DIR, 'index.html');
    }

    // Read and serve file
    fs.readFile(filePath, (error, content) => {
      if (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error: ' + error.code);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 
        'Content-Type': contentType,
        'Cache-Control': ext === '.html' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=31536000'
      });
      res.end(content, 'utf-8');
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
