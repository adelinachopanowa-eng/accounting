#!/usr/bin/env node
const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'public', 'fonts');
const FONTS = [
  { url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf', dest: 'NotoSans-Regular.ttf' },
  { url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',    dest: 'NotoSans-Bold.ttf'    },
];

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file   = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return download(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.pipe(file);
      file.on('finish', () => file.close(() => {
        const size = fs.statSync(destPath).size;
        if (size < 50000) { reject(new Error(`Too small: ${size} bytes`)); return; }
        console.log(`  ✓ ${path.basename(destPath)} (${Math.round(size/1024)} KB)`);
        resolve();
      }));
    }).on('error', (e) => { fs.unlink(destPath, () => {}); reject(e); });
  });
}

async function main() {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  console.log('Downloading fonts...');
  for (const f of FONTS) {
    const dest = path.join(FONTS_DIR, f.dest);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 50000) {
      console.log(`  → ${f.dest} already present`);
      continue;
    }
    await download(f.url, dest);
  }
  console.log('Fonts ready.');
}
main().catch(e => { console.error('Font error:', e.message); process.exit(1); });
