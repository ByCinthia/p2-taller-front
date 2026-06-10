const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src', 'assets', 'leaflet');
const nodeImages = path.join(root, 'node_modules', 'leaflet', 'dist', 'images');

const files = ['marker-icon.png', 'marker-icon-2x.png', 'marker-shadow.png'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source file not found: ${src}`);
    return false;
  }
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
  return true;
}

(function main() {
  ensureDir(srcDir);

  let any = false;
  for (const f of files) {
    const src = path.join(nodeImages, f);
    const dest = path.join(srcDir, f);
    try {
      const ok = copyFile(src, dest);
      any = any || ok;
    } catch (err) {
      console.error(`Failed to copy ${f}:`, err.message || err);
    }
  }

  if (!any) {
    console.error('No files were copied. Make sure you ran `npm install` so node_modules/leaflet exists.');
    process.exitCode = 2;
  } else {
    console.log('Leaflet asset copy complete.');
  }
})();
