/**
 * Visual QA harness. Boots the real game in headless Chromium (software WebGL)
 * and captures the runner from several angles plus render statistics.
 *
 *   node test-results/visual-check.mjs [tier]
 */
import { createServer } from 'vite';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const TIER = process.argv[2] || 'high';
const LIGHT = process.env.LIGHT || 'evening';
const PORT = 5199 + (TIER === 'low' ? 1 : 0);
const OUT = new URL('./', import.meta.url).pathname;

const SHOT_SETUPS = `({
  face: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = false;
    game.player.visual.position.set(0, 0, -4);
    game.player.visual.rotation.set(0, 0, 0);
    game.camera.position.set(0.06, 2.03, -1.25);
    game.camera.lookAt(0, 1.99, 0);
    game.camera.fov = 32;
    game.camera.updateProjectionMatrix();
  },
  hands: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = false;
    game.player.visual.position.set(0, 0, -4);
    game.player.visual.rotation.set(0, 0, 0);
    game.camera.position.set(1.05, 1.12, -0.8);
    game.camera.lookAt(0.3, 0.86, 0);
    game.camera.fov = 30;
    game.camera.updateProjectionMatrix();
  },
  torso: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = false;
    game.player.visual.position.set(0, 0, -4);
    game.player.visual.rotation.set(0, 0, 0);
    game.camera.position.set(0.5, 1.58, -1.75);
    game.camera.lookAt(0, 1.45, 0);
    game.camera.fov = 30;
    game.camera.updateProjectionMatrix();
  },
  front: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = false;
    game.player.visual.position.set(0, 0, -4);
    game.player.visual.rotation.set(0, 0, 0);
    game.camera.position.set(0.1, 1.18, -4.3);
    game.camera.lookAt(0, 1.13, 0);
    game.camera.fov = 30;
    game.camera.updateProjectionMatrix();
  },
  quarter: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = false;
    game.player.visual.position.set(0, 0, -4);
    game.player.visual.rotation.set(0, 0, 0);
    game.camera.position.set(2.7, 1.36, -3.8);
    game.camera.lookAt(0, 1.2, 0);
    game.camera.fov = 30;
    game.camera.updateProjectionMatrix();
  },
  side: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = false;
    game.player.visual.position.set(0, 0, -4);
    game.player.visual.rotation.set(0, 0, 0);
    game.camera.position.set(4.6, 1.2, 0);
    game.camera.lookAt(0, 1.2, 0);
    game.camera.fov = 30;
    game.camera.updateProjectionMatrix();
  },
  back: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = false;
    game.player.visual.position.set(0, 0, -4);
    game.player.visual.rotation.set(0, 0, 0);
    game.camera.position.set(0.4, 1.3, 4.6);
    game.camera.lookAt(0, 1.2, 0);
    game.camera.fov = 30;
    game.camera.updateProjectionMatrix();
  },
  run: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = false;
    game.player.visual.position.set(0, 0, -4);
    game.player.visual.rotation.set(0, 0, 0);
    for (let frame = 0; frame < 24; frame += 1) game.player.update(1 / 60, 30, 'running');
    game.player.group.position.set(0, 0, 0);
    game.player.visual.position.set(0, 0, 0);
    game.camera.position.set(3.9, 1.35, 1.7);
    game.camera.lookAt(0, 1.0, 0);
    game.camera.fov = 32;
    game.camera.updateProjectionMatrix();
  },
  police: (game) => {
    game.ui.hideScreens();
    game.police.group.visible = true;
    game.police.visual.rotation.y = 0;
    game.police.group.position.set(-1.9, 0, -2.2);
    game.camera.position.set(-3.9, 1.8, -4.9);
    game.camera.lookAt(-1.9, 1.32, -2.2);
    game.camera.fov = 34;
    game.camera.updateProjectionMatrix();
  },
  road: (game) => {
    game.police.group.visible = false;
    game.player.visual.position.set(-1.2, 0, 3.5);
    game.camera.position.set(0, 2.4, 8);
    game.camera.lookAt(0, 2.1, -26);
    game.camera.fov = 62;
    game.camera.updateProjectionMatrix();
  }
})`;

async function prepareChromium() {
  const binDir = join(tmpdir(), 'slbadboy-nss');
  const execPath = await chromium.executablePath();
  if (!execPath) throw new Error('chromium executable missing');
  if (!existsSync(join(binDir, 'lib'))) {
    const { mkdir: mk } = await import('node:fs/promises');
    await mk(binDir, { recursive: true });
    const archive = new URL('../node_modules/@sparticuz/chromium/bin/al2023.tar.br', import.meta.url).pathname;
    const { brotliDecompressSync } = await import('node:zlib');
    const tar = join(tmpdir(), 'al2023.tar');
    await writeFile(tar, brotliDecompressSync(await readFile(archive)));
    execFileSync('tar', ['-xf', tar, '-C', binDir]);
  }
  process.env.LD_LIBRARY_PATH = `${join(binDir, 'lib')}:${process.env.LD_LIBRARY_PATH ?? ''}`;
  return execPath;
}

await mkdir(OUT, { recursive: true });
const server = await createServer({
  root: new URL('../', import.meta.url).pathname,
  server: { host: '127.0.0.1', port: PORT, strictPort: true },
  logLevel: 'error',
});
await server.listen();
const executablePath = await prepareChromium();
const browser = await puppeteer.launch({
  executablePath,
  args: chromium.args,
  headless: true,
  defaultViewport: { width: 1280, height: 860, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});

await page.goto(`http://127.0.0.1:${PORT}/?tier=${TIER}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__LANKA_RUN__?.state === 'menu', { timeout: 90000 });
await page.waitForFunction(() => {
  const game = window.__LANKA_RUN__;
  return game && game.player?.visual && game.world?.sections?.length > 0;
}, { timeout: 90000 });

await page.evaluate(([setups, light]) => {
  window.__LIGHT__ = light;
  const game = window.__LANKA_RUN__;
  game.renderer.setAnimationLoop(null);
  const night = window.__LIGHT__ === 'night' ? 0.9 : 0.12;
  game.graphics.night = night;
  game.graphics.nightTarget = night;
  if (game.graphics.sky?.material?.uniforms?.night) {
    game.graphics.sky.material.uniforms.night.value = night;
  }
  game.graphics.setTheme(game.scene.background, game.scene.fog.color);
  game.graphics.boost = 0;
  game.player.visual.position.set(0, 0, -4);
  window.__SHOTS__ = (0, eval)(`(${setups})`);
}, [SHOT_SETUPS, LIGHT]);

const shoot = async (name, file) => {
  const dataUrl = await page.evaluate((shotName) => {
    const game = window.__LANKA_RUN__;
    window.__SHOTS__[shotName](game);
    game.renderer.render(game.scene, game.camera);
    return game.renderer.domElement.toDataURL('image/png');
  }, name);
  await writeFile(`${OUT}${file}`, Buffer.from(dataUrl.split(',')[1], 'base64'));
};

const report = await page.evaluate(() => {
  const game = window.__LANKA_RUN__;
  window.__SHOTS__.road(game);
  game.renderer.render(game.scene, game.camera);
  const info = game.renderer.info;
  return {
    calls: info.render.calls,
    triangles: info.render.triangles,
    geometries: info.memory.geometries,
    textures: info.memory.textures,
    qualityTier: game.qualityTier,
    pixelRatio: game.renderer.getPixelRatio(),
    playerMeshCount: (() => { let n = 0; game.player.visual.traverse((o) => { if (o.isMesh) n += 1; }); return n; })(),
  };
});

for (const [name, file] of [['face', 'face.png'], ['hands', 'hands.png'], ['torso', 'torso.png'],
  ['front', 'front.png'], ['quarter', 'quarter.png'], ['side', 'side.png'], ['back', 'back.png'],
  ['run', 'run.png'], ['police', 'police.png'], ['road', 'road.png']]) {
  await shoot(name, `${TIER}-${file}`);
}

report.errors = errors;
await writeFile(`${OUT}stats-${TIER}.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));

await browser.close();
await server.close();
