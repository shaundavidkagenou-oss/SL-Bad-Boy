import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const pngSize = (data) => {
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};
const jpegSize = (data) => {
  assert.equal(data.subarray(0, 3).toString('hex'), 'ffd8ff');
  for (let offset = 2; offset < data.length - 8;) {
    if (data[offset] !== 0xff) { offset += 1; continue; }
    const marker = data[offset + 1];
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return [data.readUInt16BE(offset + 7), data.readUInt16BE(offset + 5)];
    if (marker === 0xd8 || marker === 0xd9 || marker === 0xff) { offset += 2; continue; }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  throw new Error('JPEG dimensions not found');
};

test('supplied SL BAD BOY JPG drives every Android launcher density and square native splash', async () => {
  const source = await readFile(new URL('../assets/sl-bad-boy-logo.jpg', import.meta.url));
  assert.deepEqual(jpegSize(source), [720, 720]);
  await assert.rejects(access(new URL('../assets/sl-bad-boy-logo.png', import.meta.url)));
  const generator = await readFile(new URL('../scripts/render-mobile-assets.mjs', import.meta.url), 'utf8');
  assert.match(generator, /assets\/sl-bad-boy-logo\.jpg/);
  assert.match(generator, /data:image\/jpeg;base64/);

  const densities = [
    ['mdpi', 48, 108], ['hdpi', 72, 162], ['xhdpi', 96, 216],
    ['xxhdpi', 144, 324], ['xxxhdpi', 192, 432],
  ];
  for (const [density, iconSize, foregroundSize] of densities) {
    for (const [name, expected] of [
      ['ic_launcher.png', iconSize],
      ['ic_launcher_round.png', iconSize],
      ['ic_launcher_foreground.png', foregroundSize],
    ]) {
      const data = await readFile(new URL(`../android/app/src/main/res/mipmap-${density}/${name}`, import.meta.url));
      assert.deepEqual(pngSize(data), [expected, expected], `${density}/${name}`);
    }
  }

  const splash = await readFile(new URL('../android/app/src/main/res/drawable/splash_logo.png', import.meta.url));
  assert.deepEqual(pngSize(splash), [320, 320], 'square portrait artwork must be preserved without cropping');
});
