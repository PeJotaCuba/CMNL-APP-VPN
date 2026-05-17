import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generate() {
  const svgPath = path.join(__dirname, 'public', 'icons', 'icon.svg');
  const buffer = await fs.readFile(svgPath);

  const sizes = [
    { name: 'icon-192-192.png', size: 192 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512-512.png', size: 512 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'icon-maskable-512.png', size: 512 },
    { name: 'icon-512x512-maskable.png', size: 512 },
  ];

  for (const s of sizes) {
    const dest = path.join(__dirname, 'public', 'icons', s.name);
    await sharp(buffer)
      .resize(s.size, s.size)
      .png()
      .toFile(dest);
    console.log(`Generated ${s.name}`);
  }
}

generate().catch(console.error);
