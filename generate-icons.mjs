import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.resolve('public/icons/icon.svg');
const outDir = path.resolve('public/icons');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function generate() {
  try {
    await sharp(svgPath)
      .resize(192, 192)
      .png()
      .toFile(path.join(outDir, 'icon-192-192.png'));
    console.log('Generated icon-192-192.png');

    await sharp(svgPath)
      .resize(512, 512)
      .png()
      .toFile(path.join(outDir, 'icon-512-512.png'));
    console.log('Generated icon-512-512.png');

    // Apple Icons
    const appleSizes = [152, 167, 180];
    for (const size of appleSizes) {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(path.join(outDir, `icon-${size}-${size}.png`));
      console.log(`Generated icon-${size}-${size}.png`);
    }

    // Maskable icon (with padding)
    await sharp(svgPath)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 44, g: 27, b: 21, alpha: 1 } // #2C1B15
      })
      .png()
      .toFile(path.join(outDir, 'icon-maskable-512.png'));
    console.log('Generated icon-maskable-512.png');

    // Desktop screenshot (1280x720)
    await sharp({
      create: {
        width: 1280,
        height: 720,
        channels: 4,
        background: { r: 44, g: 27, b: 21, alpha: 1 }
      }
    })
      .composite([{ input: svgPath, gravity: 'center' }])
      .png()
      .toFile(path.join(outDir, 'screenshot-desktop.png'));
    console.log('Generated screenshot-desktop.png');

    // Mobile screenshot (720x1280)
    await sharp({
      create: {
        width: 720,
        height: 1280,
        channels: 4,
        background: { r: 44, g: 27, b: 21, alpha: 1 }
      }
    })
      .composite([{ input: svgPath, gravity: 'center' }])
      .png()
      .toFile(path.join(outDir, 'screenshot-mobile.png'));
    console.log('Generated screenshot-mobile.png');

  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generate();
