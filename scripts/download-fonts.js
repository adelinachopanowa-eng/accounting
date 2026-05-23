#!/usr/bin/env node
/**
 * Downloads Noto Sans TTF (Latin + Cyrillic) into public/fonts/ at build time.
 * Runs as part of vercel-build before next build.
 */
const https = require('https');
const http = require('http');
const fs   = require('fs');
const path = require('path');

const FONTS_DIR = path.join(__dirname, '..', 'public', 'fonts');

const FONTS = [
  {
    url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf',
    dest: 'NotoSans-Regular.ttf',
  },
  {
    url: 'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf',
    dest: 'NotoSans-Bold.ttf',
  },
];

function download(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(destPath);
        return download(res.headers.location, destPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const size = fs.statSync(destPath).size;
          if (size < 50000) {
            reject(new Error(`File too small (${size} bytes) — likely an error page: ${destPath}`));
          } else {
            console.log(`  ✓ ${path.basename(destPath)} (${(size / 1024).toFixed(0)} KB)`);
            resolve();
          }
        });
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
  console.log('Downloading fonts...');
  for (const font of FONTS) {
    const dest = path.join(FONTS_DIR, font.dest);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 50000) {
      console.log(`  → ${font.dest} already present, skipping`);
      continue;
    }
    await download(font.url, dest);
  }
  console.log('Fonts ready.');
}

main().catch((err) => {
  console.error('Font download error:', err.message);
  process.exit(1);
});
