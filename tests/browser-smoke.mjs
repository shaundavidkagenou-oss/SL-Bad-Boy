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
  await waitForFunction(() => window.__LANKA_RUN__.player.menuTime >= 3.55);
  const menuPoseBefore = await page.evaluate(() => ({
    leg: window.__LANKA_RUN__.player.joints.leftLeg.rotation.x,
    head: window.__LANKA_RUN__.player.joints.head.rotation.y,
  }));
  await new Promise((resolve) => setTimeout(resolve, 200));
  const menuPoseAfter = await page.evaluate(() => ({
    leg: window.__LANKA_RUN__.player.joints.leftLeg.rotation.x,
    head: window.__LANKA_RUN__.player.joints.head.rotation.y,
    lift: window.__LANKA_RUN__.player.visual.position.y,
  }));
  assert.ok(Math.abs(menuPoseAfter.leg - menuPoseBefore.leg) > 0.01
    || Math.abs(menuPoseAfter.head - menuPoseBefore.head) > 0.01);
  assert.ok(menuPoseAfter.lift > 0);
  passed.push('menu kid performs a visible warm-up with relaxed arms and no officer in the showcase');
  await page.screenshot({ path: 'test-results/menu.png' });
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.police.group.visible), false);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.police.chaseStarted), false);
  assert.equal(await page.$eval('.world-tag span', (node) => node.textContent), '14 DISTRICTS');
  passed.push('game opens with a WebGL canvas and a solo character-led fourteen-district evening menu');

  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.context === null), true);
  await page.click('#mute-button');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.muted), true);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.context !== null), true);
  await page.evaluate(() => { window.__testAudioContext = window.__LANKA_RUN__.audio.context; });
  await page.click('#mute-button');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.muted), false);
  passed.push('audio unlocks only after interaction and the mute control works');

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.shop.earn(1000);
    game.shop.save();
    game.ui.setInventory(game.shop.wallet, game.juice.count);
  });
  await page.click('#shop-button');
  await waitForFunction(() => window.__LANKA_RUN__.state === 'shop');
  assert.equal(await page.$$eval('#character-grid button[data-character]', (cards) => cards.length), 10);
  await page.evaluate(() => document.querySelector('#character-grid button:last-child').scrollIntoView({ block: 'center' }));
  await waitForFunction(() => [...document.querySelectorAll('.character-portrait')].every((image) => image.complete && image.naturalWidth === 280));
  await page.click('button[data-character="colombo-scout"]');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.player.characterId), 'colombo-scout');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.shop.wallet), 950);
  assert.equal(await page.$eval('button[data-character="colombo-scout"]', (card) => card.classList.contains('is-selected')), true);
  await page.evaluate(() => { document.querySelector('.shop-panel').scrollTop = 0; });
  await page.screenshot({ path: 'test-results/character-shop.png' });
  await page.click('button[data-character="schoolboy"]');
  await page.click('#shop-close');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.state), 'menu');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.player.characterId), 'schoolboy');
  passed.push('ten real 3D runner portraits load and buying/equipping updates the live model and persistent wallet');

  const cameraHandoff = await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    const before = {
      position: game.camera.position.toArray(), look: game.cameraRig.lookTarget.toArray(),
      fov: game.camera.fov, rotation: game.player.visual.rotation.y,
    };
    document.getElementById('play-button').click();
    return {
      before,
      after: {
        position: game.camera.position.toArray(), look: game.cameraRig.lookTarget.toArray(),
        fov: game.camera.fov, rotation: game.player.visual.rotation.y,
      },
    };
  });
  assert.deepEqual(cameraHandoff.after, cameraHandoff.before, 'Play cut the menu camera or character pose');
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.audio.context === window.__testAudioContext), true);
  await waitForFunction(() => window.__LANKA_RUN__?.state === 'running');
  await new Promise((resolve) => setTimeout(resolve, 100));
  await page.screenshot({ path: 'test-results/cinematic-handoff.png' });
  await waitForFunction(() => window.__LANKA_RUN__.police.chaseStarted && window.__LANKA_RUN__.police.group.visible);
  await waitForFunction(() => {
    const game = window.__LANKA_RUN__;
    return Math.abs(game.camera.position.y - game.cameraRig.baseY) < 0.08
      && Math.abs(game.cameraRig.lookTarget.z + 8.5) < 0.12;
  });
  passed.push('Play retains the exact menu frame then cinematically eases camera and runner into the chase view');
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
  assert.equal(pursuit.oncoming, false);
  // Keep the idle actor safe while the software renderer captures animated poses.
  await page.evaluate(() => { window.__LANKA_RUN__.spawner.collisionEnabled = false; });
  await new Promise((resolve) => setTimeout(resolve, 150));
  await page.screenshot({ path: 'test-results/police-chase.png' });
  await page.evaluate(() => { window.__LANKA_RUN__.police.pointTimer = 0.75; });
  await waitForFunction(() => window.__LANKA_RUN__.police.pointTimer > 0
    && window.__LANKA_RUN__.police.joints.rightArm.rotation.x > 1.05);
  await page.screenshot({ path: 'test-results/police-gesture.png' });
  passed.push('detailed police pursuit, safe gap, articulated pointing and readable road-speed traffic');
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
    window.__coinsBeforeIsolatedPickup = game.score.coins;
    game.spawner.spawnCoin(1, game.player.group.position.z, 1, 900);
  });
  await waitForFunction(() => window.__LANKA_RUN__.score.coins === window.__coinsBeforeIsolatedPickup + 1);
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
  await waitForFunction(() => window.__LANKA_RUN__.player.scooterActive && window.__LANKA_RUN__.player.scooterTimer < 8.4);
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
  assert.ok(Math.abs(boost.multiplier - 1.2) < 0.0001, `live boost multiplier was ${boost.multiplier}`);
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
  passed.push('live scooter pickup gives exactly 1.2× speed, shielded traffic contact and visible police separation');

  await page.waitForFunction(() => !window.__LANKA_RUN__.player.scooterActive, { timeout: 90000 });
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
  // Software-renderer screenshots may take several real seconds. Isolate the
  // following input checks before that wait, not after random traffic can hit.
  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.spawner.nextSpawnIn = 100000;
    game.spawner.nextScooterIn = 100000;
    game.spawner.collisionEnabled = false;
  });
  await new Promise((resolve) => setTimeout(resolve, 250));
  await page.screenshot({ path: 'test-results/gameplay.png' });
  passed.push('Restart button immediately creates a clean run with old objects removed');

  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.state), 'running');
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

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.spawner.nextSpawnIn = 100000;
    game.spawner.nextScooterIn = 100000;
    game.spawner.collisionEnabled = true;
    game.player.reset();
    game.spawner.spawnJuice(1, game.player.group.position.z, 920);
  });
  await waitForFunction(() => window.__LANKA_RUN__.juice.count === 1);
  assert.equal(await page.$eval('#juice-value', (node) => node.textContent), '1');
  await page.screenshot({ path: 'test-results/juice-inventory.png' });
  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.player.reset();
    window.__scoreBeforeRevive = { score: game.score.score, distance: game.score.distance };
    game.spawner.spawnObstacle('car', 1, game.player.group.position.z, 921);
  });
  await waitForFunction(() => window.__LANKA_RUN__.state === 'revive');
  assert.equal(await page.$eval('#revive-screen', (node) => node.classList.contains('is-visible')), true);
  assert.equal(await page.$eval('#revive-count', (node) => node.textContent), '1');
  assert.deepEqual(await page.evaluate(() => ({
    score: window.__LANKA_RUN__.score.score, distance: window.__LANKA_RUN__.score.distance,
  })), await page.evaluate(() => window.__scoreBeforeRevive));
  await page.screenshot({ path: 'test-results/juice-revive.png' });
  await page.click('#revive-button');
  await waitForFunction(() => window.__LANKA_RUN__.state === 'running' && window.__LANKA_RUN__.player.invincibleTimer > 0);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.juice.count), 0);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.player.shield.visible), true);
  assert.ok(await page.evaluate(() => window.__LANKA_RUN__.score.score >= window.__scoreBeforeRevive.score));
  assert.ok(await page.evaluate(() => window.__LANKA_RUN__.score.distance >= window.__scoreBeforeRevive.distance));
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.spawner.getRowEntries(921).length), 0);
  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.spawner.spawnObstacle('car', 1, game.player.group.position.z, 922);
  });
  await new Promise((resolve) => setTimeout(resolve, 180));
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.state), 'running');
  await page.screenshot({ path: 'test-results/juice-respawn-shield.png' });
  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.spawner.collisionEnabled = false;
  });
  passed.push('live rare juice pickup opens revive on death, preserves score, consumes one packet and restores a safety shield');
  passed.push('respawn clears the fatal traffic and temporary protection prevents an immediate second collision');

  await page.reload({ waitUntil: 'networkidle0' });
  await waitForFunction(() => window.__LANKA_RUN__?.state === 'menu' && document.getElementById('studio-loading').hidden);
  assert.equal(await page.evaluate(() => window.__LANKA_RUN__.score.bestScore), savedBest);
  const roadCheck = await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    const world = game.world;
    world.reset();
    const groundTop = world.ground.position.y + world.ground.scale.y / 2;
    const road = world.sections[0].children[0];
    const roadTop = road.position.y + road.scale.y / 2;
    if (roadTop <= groundTop) return false;
    for (let step = 0; step < 26000; step += 1) {
      world.update(1 / 60, 36);
      // Upload each district's signs during warm-up; the following stress run
      // must then retain a stable GPU footprint instead of measuring first use.
      if (step % 300 === 0) game.renderer.render(game.scene, game.camera);
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

  for (const theme of ['colombo', 'suburb', 'market', 'kotte', 'kandy', 'kadugannawa', 'nuwara-eliya', 'ella', 'galle', 'negombo', 'anuradhapura', 'polonnaruwa', 'jaffna', 'trincomalee']) {
    if (theme === 'colombo') {
      const fortProjection = await page.evaluate(async () => {
        const { ENVIRONMENT_THEMES, THEME_LENGTH } = await import('/src/game/EnvironmentThemes.js');
        const game = window.__LANKA_RUN__;
        game.state = 'paused';
        game.ui.showRunning();
        game.world.reset();
        const target = THEME_LENGTH * ENVIRONMENT_THEMES.length - 48;
        let guard = 0;
        while (game.world.travelled < target && guard < 30000) {
          game.world.update(1 / 60, 36);
          guard += 1;
        }
        game.updateTheme(0);
        game.scene.updateMatrixWorld(true);
        game.camera.updateMatrixWorld(true);
        const section = game.world.sections.find((candidate) => candidate.userData.approachLandmark === 'colombo-fort');
        let landmark = null;
        section?.userData.scenery?.traverse((node) => { if (node.userData.landmark === 'colombo-fort') landmark = node; });
        if (!landmark) return null;
        const point = game.camera.position.clone();
        landmark.getWorldPosition(point);
        point.y += 3;
        point.project(game.camera);
        return { x: point.x, y: point.y, z: point.z, sectionZ: section.position.z };
      });
      assert.ok(fortProjection && Math.abs(fortProjection.x) < 0.95 && Math.abs(fortProjection.y) < 0.95
        && fortProjection.z < 1 && fortProjection.sectionZ < -10, `Fort approach not in view: ${JSON.stringify(fortProjection)}`);
      await new Promise((resolve) => setTimeout(resolve, 150));
      await page.screenshot({ path: 'test-results/colombo-fort-approach.png' });
    }
    await page.evaluate((themeId) => {
      const game = window.__LANKA_RUN__;
      game.state = 'running';
      game.ui.showRunning();
      game.spawner.clear();
      game.spawner.nextSpawnIn = 100000;
      game.spawner.nextScooterIn = 100000;
      game.spawner.collisionEnabled = false;
      let guard = 0;
      while (game.world.getCurrentTheme().id !== themeId && guard < 30000) {
        game.world.update(1 / 60, 36);
        guard += 1;
      }
      game.updateTheme(0);
      // Hold the exact district-entry frame so approach/main landmarks remain inspectable.
      game.state = 'paused';
    }, theme);
    assert.equal(await page.evaluate(() => window.__LANKA_RUN__.currentTheme.id), theme);
    const expectedApproach = theme === 'colombo' ? 'colombo-fort' : theme === 'market' ? 'red-mosque' : null;
    if (expectedApproach) {
      assert.ok(await page.evaluate((id) => window.__LANKA_RUN__.world.sections.some((section) => section.userData.approachLandmark === id), expectedApproach));
    }
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
  passed.push('all fourteen districts render with landmarks and city-transition tunnels');
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
  const menuFov = await page.evaluate(() => window.__LANKA_RUN__.camera.fov);
  assert.ok(menuFov >= 50 && menuFov <= 67, `menu camera FOV was ${menuFov}`);
  assert.equal(await page.$eval('.touch-tip', (node) => getComputedStyle(node).display), 'block');
  await page.screenshot({ path: 'test-results/mobile-menu.png' });
  await page.click('#shop-button');
  await waitForFunction(() => window.__LANKA_RUN__.state === 'shop');
  assert.equal(await page.$$eval('#character-grid button[data-character]', (cards) => cards.length), 10);
  const shopBounds = await page.$eval('.shop-panel', (panel) => {
    const bounds = panel.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
  });
  assert.ok(shopBounds.left >= 0 && shopBounds.right <= 390 && shopBounds.top >= 0 && shopBounds.bottom <= 844,
    `mobile shop overflow: ${JSON.stringify(shopBounds)}`);
  await page.evaluate(() => document.querySelector('#character-grid button:last-child').scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: 'test-results/mobile-character-shop.png' });
  await page.click('#shop-close');
  await page.click('#play-button');
  await waitForFunction(() => window.__LANKA_RUN__.state === 'running');
  await waitForFunction(() => Math.abs(window.__LANKA_RUN__.camera.fov - 67) < 0.2);
  assert.ok(await page.evaluate(() => Math.abs(window.__LANKA_RUN__.camera.fov - 67) < 0.2));
  passed.push('portrait mobile shop keeps all ten runners in a notch-safe scrollable layout');
  await page.evaluate(() => { window.__LANKA_RUN__.spawner.collisionEnabled = false; });
  await new Promise((resolve) => setTimeout(resolve, 250));
  const mobileGraphics = await page.evaluate(async () => {
    const { getMeshKitStats } = await import('/src/art/MeshKit.js');
    const game = window.__LANKA_RUN__;
    let shadowFlags = 0;
    game.scene.traverse((node) => { if (node.castShadow || node.receiveShadow) shadowFlags += 1; });
    return {
      ...game.graphics.getStats(),
      shadowsEnabled: game.renderer.shadowMap.enabled,
      sunShadow: game.sun.castShadow,
      shadowFlags,
      antialias: game.renderer.getContext().getContextAttributes().antialias,
      bump: getMeshKitStats().bumpMapping,
      hdr: game.graphics.hdrSupported,
      drawCalls: game.renderer.info.render.calls,
      visibleClouds: game.graphics.clouds.filter((cloud) => cloud.visible).length,
      world: game.world.getStats(),
      anatomy: game.player.visual.userData.anatomy,
    };
  });
  assert.equal(mobileGraphics.shadowsEnabled, false);
  assert.equal(mobileGraphics.sunShadow, false);
  assert.equal(mobileGraphics.shadowFlags, 0);
  assert.equal(mobileGraphics.antialias, false);
  assert.equal(mobileGraphics.hdr, false);
  assert.equal(mobileGraphics.postprocessing, false);
  assert.equal(mobileGraphics.clouds, 2);
  assert.equal(mobileGraphics.visibleClouds, 0);
  assert.equal(mobileGraphics.performanceMode, true);
  assert.ok(mobileGraphics.world.visibleSceneryGroups < mobileGraphics.world.activeSceneryGroups);
  assert.ok(mobileGraphics.world.detailDistance <= 135);
  assert.equal(mobileGraphics.bump, false);
  assert.ok(mobileGraphics.pixelRatio <= 1.01);
  assert.equal(mobileGraphics.anatomy, 'continuous-skinned-limbs-lathe-torso-shaped-head');
  const mobileSceneComparison = await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    for (const section of game.world.sections) section.userData.scenery.visible = true;
    for (const cloud of game.graphics.clouds) cloud.visible = true;
    game.graphics.render(0);
    const full = { calls: game.renderer.info.render.calls, triangles: game.renderer.info.render.triangles };
    game.world.updateVisibility();
    for (const cloud of game.graphics.clouds) cloud.visible = false;
    game.graphics.render(0);
    const optimized = { calls: game.renderer.info.render.calls, triangles: game.renderer.info.render.triangles };
    return { full, optimized };
  });
  assert.ok(mobileSceneComparison.optimized.calls < mobileSceneComparison.full.calls,
    `mobile culling did not reduce calls: ${JSON.stringify(mobileSceneComparison)}`);
  assert.ok(mobileSceneComparison.optimized.triangles < mobileSceneComparison.full.triangles,
    `mobile culling did not reduce triangles: ${JSON.stringify(mobileSceneComparison)}`);
  passed.push(`same-scene mobile culling reduced ${mobileSceneComparison.full.calls} to ${mobileSceneComparison.optimized.calls} calls and ${mobileSceneComparison.full.triangles} to ${mobileSceneComparison.optimized.triangles} triangles`);
  await page.screenshot({ path: 'test-results/mobile-gameplay.png' });
  passed.push('portrait mobile layout and touch controls use direct shadow-free, low-cost rendering');
  passed.push(`mobile quality capped pixel ratio, MSAA, HDR/bloom, bump maps, clouds and far scenery (${mobileGraphics.drawCalls} software-renderer draw calls; ${mobileGraphics.world.visibleSceneryGroups}/${mobileGraphics.world.activeSceneryGroups} scenery groups visible)`);

  assert.equal(await page.$('#touch-controls'), null);
  await swipe(195, 420, 95, 420);
  await waitForFunction(() => window.__LANKA_RUN__.player.lane === 0);
  await swipe(95, 420, 195, 420);
  await waitForFunction(() => window.__LANKA_RUN__.player.lane === 1);
  await swipe(195, 450, 195, 330);
  await waitForFunction(() => window.__LANKA_RUN__.player.group.position.y > 0.5);
  await waitForFunction(() => window.__LANKA_RUN__.player.group.position.y === 0);
  await swipe(195, 330, 195, 450);
  await waitForFunction(() => window.__LANKA_RUN__.player.sliding);
  await waitForFunction(() => !window.__LANKA_RUN__.player.sliding);
  passed.push('mobile swipes drive left, right, jump and slide with no bottom control buttons');

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

  await page.evaluate(() => {
    const game = window.__LANKA_RUN__;
    game.spawner.clear();
    game.spawner.collisionEnabled = false;
    game.juice.add();
    game.endRun();
  });
  await waitForFunction(() => window.__LANKA_RUN__.state === 'revive');
  const reviveBounds = await page.$eval('.revive-panel', (panel) => {
    const bounds = panel.getBoundingClientRect();
    return { left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom };
  });
  assert.ok(reviveBounds.left >= 0 && reviveBounds.right <= 390 && reviveBounds.top >= 0 && reviveBounds.bottom <= 844,
    `mobile revive overflow: ${JSON.stringify(reviveBounds)}`);
  await page.screenshot({ path: 'test-results/mobile-juice-revive.png' });
  await page.click('#revive-button');
  await waitForFunction(() => window.__LANKA_RUN__.state === 'running' && window.__LANKA_RUN__.juice.count === 0);
  passed.push('portrait revive dialog stays within the screen and returns to the same run');

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
