import { Resvg } from '@resvg/resvg-js';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const resRoot = join(root, 'android/app/src/main/res');
const icon = await readFile(join(root, 'assets/icon.svg'), 'utf8');
const iconData = `data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}`;
const fontCandidates = [
  process.env.SL_BAD_BOY_FONT,
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  'C:/Windows/Fonts/arialbd.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
].filter((path) => path && existsSync(path));

function render(svg, width) {
  const renderer = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { fontFiles: fontCandidates, loadSystemFonts: true, defaultFontFamily: 'Arial' },
  });
  return renderer.render().asPng();
}

const image = (x, y, size) => `<image href="${iconData}" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
const densities = [
  ['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432],
];
for (const [density, size, foreground] of densities) {
  const directory = join(resRoot, `mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'ic_launcher.png'), render(icon, size));
  const inner = Math.round(foreground * 2 / 3);
  const offset = (foreground - inner) / 2;
  const foregroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${foreground}" height="${foreground}" viewBox="0 0 ${foreground} ${foreground}">${image(offset, offset, inner)}</svg>`;
  await writeFile(join(directory, 'ic_launcher_foreground.png'), render(foregroundSvg, foreground));
  const radius = size / 2;
  const roundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><clipPath id="round"><circle cx="${radius}" cy="${radius}" r="${radius}"/></clipPath></defs><g clip-path="url(#round)">${image(0, 0, size)}</g></svg>`;
  await writeFile(join(directory, 'ic_launcher_round.png'), render(roundSvg, size));
}

const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
  ${image(205, 60, 230)}
  <text x="320" y="380" text-anchor="middle" fill="#fff8e7" font-family="DejaVu Sans,Arial,sans-serif" font-size="54" font-weight="700">SL BAD BOY</text>
  <text x="320" y="432" text-anchor="middle" fill="#f4b942" font-family="DejaVu Sans,Arial,sans-serif" font-size="19" font-weight="700" letter-spacing="3">SCHOOLBOY RUSH</text>
  <rect x="190" y="462" width="260" height="6" fill="#1f8a70"/>
  <text x="320" y="515" text-anchor="middle" fill="#b9c8c8" font-family="DejaVu Sans,Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="1">SHAUN DAVID STUDIOS</text>
</svg>`;
await mkdir(join(resRoot, 'drawable'), { recursive: true });
await writeFile(join(resRoot, 'drawable/splash_logo.png'), render(splash, 320));

// Remove Capacitor's density/orientation-specific defaults so splash.xml is used everywhere.
async function removeOldSplashes(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await removeOldSplashes(path);
    else if (entry.name === 'splash.png') await rm(path);
  }
}
await removeOldSplashes(resRoot);
console.log('Generated SL BAD BOY Android launcher icons and native splash.');
