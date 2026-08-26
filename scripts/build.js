const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'www');

console.log('[Build] Packaging web assets for Android into www/...');

// Clean dist directory
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir, { recursive: true });

// Files to copy
const filesToCopy = [
  'index.html',
  'privacy-policy.html',
  'manifest.json'
];

for (const file of filesToCopy) {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  ✓ Copied ${file}`);
  }
}

// Folders to copy
const foldersToCopy = ['css', 'js', 'icons'];

for (const folder of foldersToCopy) {
  const src = path.join(rootDir, folder);
  const dest = path.join(distDir, folder);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { recursive: true });
    console.log(`  ✓ Copied ${folder}/`);
  }
}

console.log('[Build] Web assets packaging completed successfully!');
