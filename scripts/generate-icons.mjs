// Tao icon.png (1024) va favicon tu assets/icon.svg bang sharp: npm run icons
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const svg = readFileSync(new URL('../assets/icon.svg', import.meta.url));
await sharp(svg).resize(1024, 1024).png().toFile(new URL('../assets/icon.png', import.meta.url).pathname);
await sharp(svg).resize(256, 256).png().toFile(new URL('../assets/favicon.png', import.meta.url).pathname);
console.log('icons done');
