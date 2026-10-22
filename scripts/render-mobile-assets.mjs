import { Resvg } from '@resvg/resvg-js';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const resRoot = join(root, 'android/app/src/main/res');
const logo = await readFile(join(root, 'assets/sl-bad-boy-logo.png'));
const logoData = `data:image/png;base64,${logo.toString('base64')}`;

function render(svg, width) {
  const renderer = new Resvg(svg, { fitTo: { mode: 'width', value: width } });
  return renderer.render().asPng();
}

const logoImage = (width, height = width, fit = 'slice') =>
  `<image href="${logoData}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid ${fit}"/>`;
const squareLogo = (size) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${logoImage(size)}</svg>`;

const densities = [
  ['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216],
  ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432],
];
for (const [density, size, foreground] of densities) {
  const directory = join(resRoot, `mipmap-${density}`);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'ic_launcher.png'), render(squareLogo(size), size));
  await writeFile(join(directory, 'ic_launcher_foreground.png'), render(squareLogo(foreground), foreground));
  const radius = size / 2;
  const roundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><clipPath id="round"><circle cx="${radius}" cy="${radius}" r="${radius}"/></clipPath></defs><g clip-path="url(#round)">${logoImage(size)}</g></svg>`;
  await writeFile(join(directory, 'ic_launcher_round.png'), render(roundSvg, size));
}

// Preserve the owner's complete portrait artwork on the native loading splash.
const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1114" viewBox="0 0 1024 1114">${logoImage(1024, 1114, 'meet')}</svg>`;
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
console.log('Generated Android launcher icons and native splash from the supplied SL BAD BOY artwork.');
