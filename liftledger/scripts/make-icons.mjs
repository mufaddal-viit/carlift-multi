// Draws every app icon from the LiftLedger mark (the same shapes as src/components/shell/logo.tsx).
// Run after changing the mark: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const BRAND = '#0F8A5F';
const MARK = `
  <path d="M11 25V15a5 5 0 0 1 5-5h4a5 5 0 0 1 0 10h-3" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="11" cy="25" r="2.6" fill="#fff"/>
  <circle cx="24.5" cy="25" r="2.6" fill="#fff" fill-opacity=".55"/>`;

/** The mark in a round brand disc, for browser tabs. */
const disc = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><circle cx="18" cy="18" r="18" fill="${BRAND}"/>${MARK}</svg>`;

/**
 * The mark on a full square, for home screens: iOS and Android cut their own shape out of it.
 * `scale` shrinks the mark towards the centre; maskable icons keep it inside the middle 80%.
 */
const square = (scale) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" fill="${BRAND}"/>` +
  `<g transform="translate(18 18.6) scale(${scale}) translate(-18 -17.5)">${MARK}</g></svg>`;

const png = (svg, size) => sharp(Buffer.from(svg), { density: 72 * Math.ceil(size / 36) }).resize(size, size).png().toBuffer();

/** An .ico holding PNG images, which every current browser reads. */
function ico(images) {
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, data }, i) => {
    const at = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, at);
    header.writeUInt8(size >= 256 ? 0 : size, at + 1);
    header.writeUInt16LE(1, at + 4);
    header.writeUInt16LE(32, at + 6);
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...images.map((x) => x.data)]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('src/app/icon.svg', disc);
writeFileSync('src/app/favicon.ico', ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(disc, size) })))));
writeFileSync('src/app/apple-icon.png', await png(square(1.15), 180));
writeFileSync('public/icons/icon-192.png', await png(square(1.15), 192));
writeFileSync('public/icons/icon-512.png', await png(square(1.15), 512));
writeFileSync('public/icons/maskable-512.png', await png(square(0.9), 512));
console.log('Icons written: src/app/{icon.svg,favicon.ico,apple-icon.png}, public/icons/*.png');
