import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

let puppeteer;
try {
  puppeteer = (await import('puppeteer-core')).default;
} catch {
  console.error('Install the optional browser test dependencies first. See README.md.');
  process.exit(2);
}

await mkdir('test-results', { recursive: true });
const server = await createServer({
  root: process.cwd(),
  logLevel: 'error',
  server: { host: '127.0.0.1', port: 5187, strictPort: false },
});
await server.listen();
const address = server.httpServer.address();
const url = `http://127.0.0.1:${address.port}`;
let executablePath = process.env.CHROME_PATH;
let browserArgs = ['--no-sandbox', '--disable-setuid-sandbox', '--enable-unsafe-swiftshader'];
if (!executablePath) {
  let chromium;
  let inflate;
  try {
    const chromiumModule = await import('@sparticuz/chromium');
    chromium = chromiumModule.default;
    inflate = chromiumModule.inflate;
  } catch {
    console.error('Install @sparticuz/chromium or set CHROME_PATH. See README.md.');
    process.exit(2);
  }
  chromium.setGraphicsMode = true;
  if (process.platform === 'linux') {
    // The bundled NSS runtime is needed on minimal Linux hosts. Newer Chromium
    // packages only auto-extract it on Amazon Linux, so make it explicit here.
    const require = createRequire(import.meta.url);
    const packageEntry = require.resolve('@sparticuz/chromium');
    const runtime = await inflate(join(dirname(packageEntry), '../bin/al2023.tar.br'));
    process.env.LD_LIBRARY_PATH = `${join(runtime, 'lib')}:${process.env.LD_LIBRARY_PATH ?? ''}`;
  }
  executablePath = await chromium.executablePath();
  browserArgs = [...chromium.args, ...browserArgs];
}
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  args: browserArgs,
});
const page = await browser.newPage();
const runtimeErrors = [];
const passed = [];
page.on('pageerror', (error) => runtimeErrors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push(message.text());
});

async function waitForFunction(fn, ...args) {
  await page.waitForFunction(fn, { timeout: 15000 }, ...args);
}

async function assertStudioWordmarkFits() {
  const bounds = await page.evaluate(() => {
    const text = document.querySelector('.studio-wordmark strong').getBoundingClientRect();
    const frame = document.querySelector('.studio-frame').getBoundingClientRect();
    return { left: text.left, right: text.right, frameLeft: frame.left, frameRight: frame.right, width: innerWidth };
  });
  assert.ok(bounds.left >= bounds.frameLeft && bounds.right <= bounds.frameRight && bounds.right <= bounds.width,
    `studio wordmark overflow: ${JSON.stringify(bounds)}`);
}

try {
  await page.goto(url, { waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('#studio-loading', (node) => node.hidden), false);
  assert.equal(await page.$eval('#studio-loading', (node) => getComputedStyle(node).backgroundColor), 'rgb(5, 5, 5)');
  assert.ok(await page.$eval('.studio-wordmark', (node) => node.textContent.includes('SHAUN DAVID') && node.textContent.includes('STUDIOS')));
  await assertStudioWordmarkFits();
  await page.screenshot({ path: 'test-results/studio-loading.png' });
  await waitForFunction(() => window.__LANKA_RUN__?.state === 'menu' && document.getElementById('studio-loading').hidden);
  const studioDuration = await page.$eval('#studio-loading', (node) => Number(node.dataset.duration));
  assert.ok(studioDuration >= 4990, `studio intro lasted only ${studioDuration} ms`);
  passed.push('black-and-white Shaun David Studios intro displays for at least five seconds');
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(await page.$eval('#fatal-error', (node) => node.hidden), true);
  assert.equal(await page.$eval('#scene canvas', (node) => node.width > 0), true);
  await page.screenshot({ path: 'test-results/menu.png' });
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.police.group.visible), false);
  passed.push('game opens with a WebGL canvas, start menu and no idle officer');

  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.context === null), true);
  await page.click('#mute-button');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.muted), true);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.context !== null), true);
  await page.evaluate(() => { window.__testAudioContext = window.__LANKA_RUN__.audio.context; });
  await page.click('#mute-button');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.muted), false);
  passed.push('audio unlocks only after interaction and the mute control works');

  await page.click('#play-button');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.context === window.__testAudioContext), true);
  await waitForFunction(() => window.__LANKA_RUN__?.state === 'running');
  await waitForFunction(() => window.__LANKA_RUN__.police.chaseStarted && window.__LANKA_RUN__.police.group.visible);
  const kinds = await page.evaluate(() => window.__LANKA_RUN__.spawner.getActiveKinds());
  for (const kind of ['public-bus', 'private-bus', 'car', 'tuk-tuk', 'cone', 'barrier']) {
    assert.ok(kinds.includes(kind), `${kind} missing from initial run`);
  }
  const pursuit = await page.evaluate(() => ({
    uniform: window.__LANKA_RUN__.police.visual.userData.uniform,
    gap: window.__LANKA_RUN__.police.getGap(),
    detailedJoints: Boolean(window.__LANKA_RUN__.police.joints.pelvis && window.__LANKA_RUN__.police.joints.baton),
    visible: window.__LANKA_RUN__.police.group.visible,
    chaseStarted: window.__LANKA_RUN__.police.chaseStarted,
    oncoming: window.__LANKA_RUN__.spawner.entries.some((entry) => entry.oncoming),
  }));
  assert.equal(pursuit.uniform, 'khaki-shirt-trousers-navy-peaked-cap');
  assert.ok(pursuit.gap >= 2.2);
  assert.equal(pursuit.detailedJoints, true);
  assert.equal(pursuit.visible, true);
  assert.equal(pursuit.chaseStarted, true);
  assert.equal(pursuit.oncoming, true);
  // Keep the idle actor safe while the software renderer captures animated poses.
  await page.evaluate(() => { window.__LANKA_RUN__.spawner.collisionEnabled = false; });
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.screenshot({ path: 'test-results/police-chase.png' });
  await page.evaluate(() => { window.__LANKA_RUN__.police.pointTimer = 0.75; });
  await waitForFunction(() => window.__LANKA_RUN__.police.pointTimer > 0
    && window.__LANKA_RUN__.police.joints.rightArm.rotation.x > 1.05);
  await page.screenshot({ path: 'test-results/police-gesture.png' });
  passed.push('detailed police pursuit, safe gap, articulated pointing and initial oncoming traffic');
  passed.push('buses, cars, tuk-tuks and road hazards spawn in the live game');

  await page.keyboard.press('ArrowLeft');
  await waitForFunction(() => Math.abs(window.__LANKA_RUN__.player.group.position.x + 3.1) < 0.08);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.player.lane), 0);
  await page.keyboard.press('ArrowRight');
  await waitForFunction(() => Math.abs(window.__LANKA_RUN__.player.group.position.x) < 0.08);
  await page.keyboard.press('Space');
  await waitForFunction(() => window.__LANKA_RUN__.player.group.position.y > 1);
  await page.screenshot({ path: 'test-results/jump.png' });
  await waitForFunction(() => window.__LANKA_RUN__.player.group.position.y === 0);
  await page.keyboard.press('s');
  await waitForFunction(() => window.__LANKA_RUN__.player.sliding);
  assert.ok(await page.evaluate(() => window.__LANKA_RUN__.player.getCollider().maxY < 1));
  await new Promise((resolve) => setTimeout(resolve, 160));
  await page.screenshot({ path: 'test-results/slide.png' });
  await waitForFunction(() => !window.__LANKA_RUN__.player.sliding);
  passed.push('keyboard lane changes, jump physics and slide collider work in the browser');

  await page.keyboard.press('Escape');
  await waitForFunction(() => window.__LANKA_RUN__.state === 'paused');
  const pausedDistance = await page.evaluate(() => window.__LANKA_RUN__.score.distance);
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.score.distance), pausedDistance);
  await page.keyboard.press('Escape');
  await waitForFunction(() => window.__LANKA_RUN__.state === 'running');
  passed.push('Escape pauses and resumes without advancing the run');

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.spawner.nextSpawnIn = 999;
    game.player.reset();
    game.spawner.collisionEnabled = true;
    game.spawner.spawnCoin(1, game.player.group.position.z, 1, 900);
  });
  await waitForFunction(() => window.__LANKA_RUN__.score.coins === 1);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.spawner.getRowEntries(900).length), 0);
  assert.equal(await page.evaluate(() => 'coinTimer' in window.__LANKA_RUN__.player), false);
  assert.ok(await page.evaluate(() => Math.abs(window.__LANKA_RUN__.player.joints.rightArm.rotation.z) < 0.02));
  await page.screenshot({ path: 'test-results/coin-pickup.png' });
  passed.push('live coin overlap collects once and updates score without a schoolboy arm gesture');

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.player.reset();
    game.spawner.collisionEnabled = true;
    game.spawner.nextSpawnIn = 100000;
    game.spawner.nextScooterIn = 100000;
    game.spawner.spawnScooter(1, game.player.group.position.z - 3, 910);
  });
  await waitForFunction(() => window.__LANKA_RUN__.player.scooterActive && window.__LANKA_RUN__.speed > 100);
  const boost = await page.evaluate(async () => {
    const { GAME } = await import('/src/config.js');
    const game = window.__LANKA_RUN__;
    const cruise = Math.min(GAME.maxSpeed, GAME.baseSpeed + game.elapsed * GAME.acceleration);
    return {
      multiplier: game.speed / cruise,
      timer: game.player.scooterTimer,
      scooterVisible: game.player.scooter.visible,
      shieldVisible: game.player.shield.visible,
      hudVisible: document.getElementById('boost-hud').classList.contains('is-visible'),
    };
  });
  assert.ok(Math.abs(boost.multiplier - 10) < 0.0001, `live boost multiplier was ${boost.multiplier}`);
  assert.ok(boost.timer <= 10 && boost.timer > 8);
  assert.equal(boost.scooterVisible, true);
  assert.equal(boost.shieldVisible, true);
  assert.equal(boost.hudVisible, true);
  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.spawnObstacle('car', 1, game.player.group.position.z - 8, 911);
  });
  await waitForFunction(() => window.__LANKA_RUN__.spawner.getRowEntries(911).length === 0);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.state), 'running');
  await waitForFunction(() => window.__LANKA_RUN__.police.getGap() > 12 && !window.__LANKA_RUN__.police.group.visible);
  await page.screenshot({ path: 'test-results/scooter-boost.png' });
  passed.push('live scooter pickup gives 10× speed, shielded traffic contact and visible police separation');

  await page.waitForFunction(() => !window.__LANKA_RUN__.player.scooterActive && window.__LANKA_RUN__.speed < 100, { timeout: 90000 });
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.player.scooter.visible), false);
  assert.equal(await page.$eval('#boost-hud', (node) => node.classList.contains('is-visible')), false);
  await waitForFunction(() => window.__LANKA_RUN__.police.getGap() < 4 && window.__LANKA_RUN__.police.group.visible);
  passed.push('scooter expires naturally after its countdown and the officer returns to the chase');

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.player.reset();
    game.player.slide();
    game.spawner.spawnObstacle('overhead', 1, game.player.group.position.z, 901);
  });
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.state), 'running');
  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.player.reset();
    game.player.group.position.y = 1.3;
    game.spawner.spawnObstacle('barrier', 1, game.player.group.position.z, 902);
  });
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.state), 'running');
  passed.push('slide and jump colliders avoid their matching live obstacles');

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.player.reset();
    game.spawner.collisionEnabled = false;
    game.spawner.spawnObstacle('public-bus', 0, -5, 904, { oncoming: true });
    game.spawner.spawnObstacle('private-bus', 2, -9, 905, { oncoming: false });
    window.__trafficBefore = game.spawner.entries.map((entry) => ({ rowId: entry.rowId, z: entry.mesh.position.z }));
  });
  await waitForFunction(() => {
    const game = window.__LANKA_RUN__;
    const entry = game.spawner.entries.find((candidate) => candidate.rowId === 905);
    const before = window.__trafficBefore.find((candidate) => candidate.rowId === 905);
    return entry && entry.mesh.position.z - before.z >= 1.5;
  });
  const oncomingMotion = await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    return game.spawner.entries.filter((entry) => entry.rowId === 904 || entry.rowId === 905).map((entry) => ({
      rowId: entry.rowId,
      travel: entry.mesh.position.z - window.__trafficBefore.find((before) => before.rowId === entry.rowId).z,
    }));
  });
  const fastBus = oncomingMotion.find((entry) => entry.rowId === 904).travel;
  const roadSpeedBus = oncomingMotion.find((entry) => entry.rowId === 905).travel;
  assert.ok(fastBus > roadSpeedBus + 0.5, `${fastBus} should exceed ${roadSpeedBus}`);
  await page.screenshot({ path: 'test-results/traffic.png' });
  passed.push('oncoming bus moves faster than a regular bus in the live game');

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.player.reset();
    game.spawner.collisionEnabled = true;
    game.spawner.spawnObstacle('car', 1, game.player.group.position.z, 903);
  });
  await waitForFunction(() => window.__LANKA_RUN__.state === 'gameover');
  assert.equal(await page.$eval('#gameover-screen', (node) => node.classList.contains('is-visible')), true);
  const savedBest = await page.evaluate(() => window.__LANKA_RUN__.score.bestScore);
  assert.ok(savedBest > 0);
  await page.screenshot({ path: 'test-results/gameover.png' });
  passed.push('vehicle collision enters game over and saves a best score');

  const fresh = await page.evaluate(() => {
    document.getElementById('restart-button').click();
    const game = window.__LANKA_RUN__;
    return {
      state: game.state,
      score: game.score.score,
      coins: game.score.coins,
      distance: game.score.distance,
      speed: game.speed,
      lane: game.player.lane,
      y: game.player.group.position.y,
      testRows: game.spawner.entries.filter((entry) => entry.rowId >= 900).length,
    };
  });
  assert.deepEqual(fresh, {
    state: 'running', score: 0, coins: 0, distance: 0, speed: 14, lane: 1, y: 0, testRows: 0,
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.screenshot({ path: 'test-results/gameplay.png' });
  passed.push('Restart button immediately creates a clean run with old objects removed');

  await page.evaluate(() => { window.__LANKA_RUN__.spawner.collisionEnabled = false; });
  const cdp = await page.createCDPSession();
  const swipe = async (fromX, fromY, toX, toY) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y: fromY, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: toX, y: toY, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(640, 420, 540, 420);
  await waitForFunction(() => window.__LANKA_RUN__.player.lane === 0);
  await swipe(640, 450, 640, 320);
  await waitForFunction(() => window.__LANKA_RUN__.player.group.position.y > 0.5);
  await waitForFunction(() => window.__LANKA_RUN__.player.group.position.y === 0);
  passed.push('real dispatched touch swipes change lanes and trigger jumping');

  await page.reload({ waitUntil: 'networkidle0' });
  await waitForFunction(() => window.__LANKA_RUN__?.state === 'menu' && document.getElementById('studio-loading').hidden);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.score.bestScore), savedBest);
  const roadCheck = await page.evaluate(() => {
    const world = window.__LANKA_RUN__.world;
    world.reset();
    const groundTop = world.ground.position.y + world.ground.scale.y / 2;
    const road = world.sections[0].children[0];
    const roadTop = road.position.y + road.scale.y / 2;
    if (roadTop <= groundTop) return false;
    for (let step = 0; step < 6000; step += 1) {
      world.update(1 / 60, 36);
      const sorted = world.getSectionCenters().sort((a, b) => a - b);
      for (let index = 1; index < sorted.length; index += 1) {
        if (Math.abs(sorted[index] - sorted[index - 1] - 30) > 0.0001) return false;
      }
    }
    return true;
  });
  assert.equal(roadCheck, true);
  passed.push('best score survives reload and live road sections recycle without gaps');

  const resourcesBefore = await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.renderer.render(game.scene, game.camera);
    return {
      geometries: game.renderer.info.memory.geometries,
      textures: game.renderer.info.memory.textures,
      children: game.world.group.children.length,
      rebuilds: game.world.rebuildCount,
      drawCalls: game.renderer.info.render.calls,
    };
  });
  assert.ok(resourcesBefore.drawCalls < 700, `batched scene used ${resourcesBefore.drawCalls} draw calls`);
  const stress = await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    const started = performance.now();
    for (let step = 0; step < 6000; step += 1) game.world.update(1 / 60, 36);
    game.updateTheme(0);
    game.renderer.render(game.scene, game.camera);
    return {
      milliseconds: performance.now() - started,
      geometries: game.renderer.info.memory.geometries,
      textures: game.renderer.info.memory.textures,
      children: game.world.group.children.length,
      stats: game.world.getStats(),
    };
  });
  assert.equal(stress.stats.activeSections, 9);
  assert.equal(stress.stats.activeSceneryGroups, 9);
  assert.equal(stress.stats.pendingScenery, 0);
  assert.ok(stress.stats.rebuildCount > resourcesBefore.rebuilds);
  assert.equal(stress.children, resourcesBefore.children);
  assert.ok(stress.geometries <= resourcesBefore.geometries + 8, `GPU geometry count grew from ${resourcesBefore.geometries} to ${stress.geometries}`);
  assert.ok(stress.textures <= resourcesBefore.textures + 8, `GPU texture count grew from ${resourcesBefore.textures} to ${stress.textures}`);
  assert.ok(stress.milliseconds < 30000, `6,000-step world stress took ${stress.milliseconds} ms`);
  passed.push(`7,200 metres of themed recycling kept scene and GPU resource counts stable (${Math.round(stress.milliseconds)} ms stress step)`);

  for (const theme of ['suburb', 'market', 'kotte', 'kandy', 'kadugannawa', 'nuwara-eliya', 'ella', 'galle', 'negombo']) {
    await page.evaluate((themeId) => {
      const game = window.__LANKA_RUN__;
      game.state = 'running';
      game.ui.showRunning();
      game.spawner.clear();
      game.spawner.nextSpawnIn = 100000;
      game.spawner.nextScooterIn = 100000;
      game.spawner.collisionEnabled = false;
      let guard = 0;
      while (game.world.getCurrentTheme().id !== themeId && guard < 5000) {
        game.world.update(1 / 60, 36);
        guard += 1;
      }
      game.updateTheme(0);
    }, theme);
    assert.equal(await page.evaluate(() => window.__LANKA_RUN__.currentTheme.id), theme);
    await new Promise((resolve) => setTimeout(resolve, 350));
    await page.screenshot({ path: `test-results/${theme}.png` });
    if (theme === 'kadugannawa' || theme === 'ella') {
      await page.evaluate(() => {
        const game = window.__LANKA_RUN__;
        let guard = 0;
        while (!game.world.sections.some((section) => section.userData.tunnel && Math.abs(section.position.z) <= 15) && guard < 1000) {
          game.world.update(1 / 60, 36);
          guard += 1;
        }
        for (let step = 0; step < 25; step += 1) game.world.update(1 / 60, 36);
        game.updateTheme(0);
      });
      assert.equal(await page.evaluate(() => window.__LANKA_RUN__.world.sections.some((section) => section.userData.tunnel && Math.abs(section.position.z) <= 15)), true);
      await new Promise((resolve) => setTimeout(resolve, 200));
      await page.screenshot({ path: `test-results/${theme}-tunnel.png` });
    }
  }
  passed.push('all ten districts render with landmarks and both hill-country tunnel runs');
  assert.equal(await page.evaluate(() => document.fonts.check('700 48px "Noto Sans Sinhala"', 'බස්')), true);
  assert.equal(await page.evaluate(() => document.fonts.check('700 48px "Noto Sans Tamil"', 'பேருந்து')), true);
  const signTexts = await page.evaluate(() => {
    const texts = [];
    window.__LANKA_RUN__.scene.traverse((node) => { if (node.userData.text) texts.push(node.userData.text); });
    return texts;
  });
  assert.ok(signTexts.some((text) => text.includes('ආයුබෝවන්')));
  assert.ok(signTexts.some((text) => text.includes('පොලිස්')));
  assert.ok(signTexts.filter((text) => /[\u0d80-\u0dff]/.test(text)).length >= 5);
  passed.push('districts and police render real Sinhala boards with bundled local fonts');

  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true } });
  await page.reload({ waitUntil: 'networkidle0' });
  assert.equal(await page.$eval('#studio-loading', (node) => node.hidden), false);
  await assertStudioWordmarkFits();
  await page.screenshot({ path: 'test-results/mobile-studio-loading.png' });
  await waitForFunction(() => window.__LANKA_RUN__?.state === 'menu' && document.getElementById('studio-loading').hidden);
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(await page.$eval('#scene canvas', (node) => node.clientWidth), 390);
  assert.ok(await page.evaluate(() => window.__LANKA_RUN__.camera.fov >= 67));
  assert.equal(await page.$eval('.touch-tip', (node) => getComputedStyle(node).display), 'block');
  await page.screenshot({ path: 'test-results/mobile-menu.png' });
  await page.click('#play-button');
  await waitForFunction(() => window.__LANKA_RUN__.state === 'running');
  await page.evaluate(() => { window.__LANKA_RUN__.spawner.collisionEnabled = false; });
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.screenshot({ path: 'test-results/mobile-gameplay.png' });
  passed.push('portrait mobile layout, touch instructions and portrait camera remain usable');

  await page.click('#touch-controls button[data-action="left"]');
  await waitForFunction(() => window.__LANKA_RUN__.player.lane === 0);
  await page.click('#touch-controls button[data-action="right"]');
  await waitForFunction(() => window.__LANKA_RUN__.player.lane === 1);
  await page.click('#touch-controls button[data-action="jump"]');
  await waitForFunction(() => window.__LANKA_RUN__.player.group.position.y > 0.5);
  await waitForFunction(() => window.__LANKA_RUN__.player.group.position.y === 0);
  await page.click('#touch-controls button[data-action="slide"]');
  await waitForFunction(() => window.__LANKA_RUN__.player.sliding);
  await waitForFunction(() => !window.__LANKA_RUN__.player.sliding);
  passed.push('on-screen mobile left, right, jump and slide buttons drive the live player');

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.collisionEnabled = false;
    game.player.startScooter();
  });
  await waitForFunction(() => document.getElementById('boost-hud').classList.contains('is-visible'));
  await new Promise((resolve) => setTimeout(resolve, 250));
  const mobileBoostBounds = await page.$eval('#boost-hud', (node) => {
    const bounds = node.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
  });
  assert.ok(mobileBoostBounds.left >= 0 && mobileBoostBounds.right <= 390 && mobileBoostBounds.top >= 0 && mobileBoostBounds.bottom <= 844,
    `mobile boost HUD overflow: ${JSON.stringify(mobileBoostBounds)}`);
  const mobileAudioTop = await page.$eval('#mute-button', (node) => node.getBoundingClientRect().top);
  assert.ok(mobileBoostBounds.bottom < mobileAudioTop, 'mobile boost HUD overlaps the sound control');
  await page.screenshot({ path: 'test-results/mobile-scooter-boost.png' });
  await page.evaluate(() => window.__LANKA_RUN__.player.stopScooter());
  passed.push('portrait scooter HUD and seated rider stay within the mobile layout');

  assert.deepEqual(runtimeErrors, []);
  passed.push('no browser runtime errors, page errors or missing-resource errors');
  console.log(`Browser playtest passed (${passed.length} checks):`);
  passed.forEach((message, index) => console.log(`${index + 1}. ${message}`));
  console.log('Screenshots: test-results/ (police chase, scooter boost, traffic, poses, all districts, tunnels and mobile)');
} catch (error) {
  await page.screenshot({ path: 'test-results/browser-failure.png' }).catch(() => {});
  console.error('Completed checks:', passed);
  throw error;
} finally {
  await browser.close();
  await server.close();
}
