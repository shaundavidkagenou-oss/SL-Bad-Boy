import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pngSize = (data) => {
  assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};

test('supplied SL BAD BOY artwork drives every Android launcher density and native splash', async () => {
  const source = await readFile(new URL('../assets/sl-bad-boy-logo.png', import.meta.url));
  assert.deepEqual(pngSize(source), [1024, 1114]);
  const generator = await readFile(new URL('../scripts/render-mobile-assets.mjs', import.meta.url), 'utf8');
  assert.match(generator, /assets\/sl-bad-boy-logo\.png/);
  assert.match(generator, /data:image\/png;base64/);

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
  assert.deepEqual(pngSize(splash), [320, 348], 'full portrait artwork must be preserved without cropping');
});
