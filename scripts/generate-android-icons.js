const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const sourceIconPath = path.join(rootDir, 'icons', 'icon-512.png');
const resDir = path.join(rootDir, 'android', 'app', 'src', 'main', 'res');

async function generateIcons() {
  console.log('[Icons] Generating all Android icons & ONE Store assets from source icon...');

  const sourceBuffer = fs.readFileSync(sourceIconPath);

  // 1. Web icons
  await sharp(sourceBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(rootDir, 'icons', 'icon-192.png'));
  console.log('  ✓ Generated icons/icon-192.png');

  await sharp(sourceBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(rootDir, 'icons', 'icon-512.png'));
  console.log('  ✓ Generated icons/icon-512.png');

  await sharp(sourceBuffer)
    .resize(512, 512)
    .png({ compressionLevel: 9 })
    .toFile(path.join(rootDir, 'icons', 'onestore-icon-512.png'));
  console.log('  ✓ Generated icons/onestore-icon-512.png (ONE Store Listing Icon)');

  // 2. Android Mipmap Icons
  const mipmapSizes = [
    { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 }
  ];

  for (const m of mipmapSizes) {
    const targetDir = path.join(resDir, m.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png
    await sharp(sourceBuffer)
      .resize(m.size, m.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png
    await sharp(sourceBuffer)
      .resize(m.size, m.size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png
    await sharp(sourceBuffer)
      .resize(m.fgSize, m.fgSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`  ✓ Generated ${m.dir} icons (${m.size}px / fg ${m.fgSize}px)`);
  }

  // 3. Splash Screen image
  const splashDir = path.join(resDir, 'drawable');
  if (!fs.existsSync(splashDir)) fs.mkdirSync(splashDir, { recursive: true });
  await sharp(sourceBuffer)
    .resize(256, 256)
    .png()
    .toFile(path.join(splashDir, 'splash.png'));
  console.log('  ✓ Generated splash.png');

  console.log('[Icons] All icons successfully generated!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
