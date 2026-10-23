import test from 'node:test';
import assert from 'node:assert/strict';
import { handleNativeBack, installMobileListeners, prepareMobilePlatform, hideNativeSplash } from '../src/mobile/MobilePlatform.js';

test('Android Back follows pause, resume, game-over and menu navigation', () => {
  const calls = [];
  const game = {
    state: 'running',
    pause: () => { calls.push('pause'); game.state = 'paused'; },
    resume: () => { calls.push('resume'); game.state = 'running'; },
    goToMenu: () => { calls.push('menu'); game.state = 'menu'; },
  };
  const exit = () => calls.push('exit');
  handleNativeBack(game, exit);
  assert.equal(game.state, 'paused');
  handleNativeBack(game, exit);
  assert.equal(game.state, 'running');
  game.state = 'gameover';
  handleNativeBack(game, exit);
  assert.equal(game.state, 'menu');
  handleNativeBack(game, exit);
  assert.deepEqual(calls, ['pause', 'resume', 'menu', 'exit']);
});

test('Android Back closes the shop and safely ends a pending revive', () => {
  const calls = [];
  const game = {
    state: 'shop',
    closeShop: () => { calls.push('close-shop'); game.state = 'menu'; },
    finishRun: () => { calls.push('finish-revive'); game.state = 'gameover'; },
  };
  handleNativeBack(game, () => calls.push('exit'));
  assert.equal(game.state, 'menu');
  game.state = 'revive';
  handleNativeBack(game, () => calls.push('exit'));
  assert.equal(game.state, 'gameover');
  assert.deepEqual(calls, ['close-shop', 'finish-revive']);
});

test('web platform skips native setup and splash without touching the DOM', async () => {
  assert.equal(prepareMobilePlatform(), false);
  await hideNativeSplash();
});

test('native listener guard installs Back and app-state exactly once', async () => {
  const listeners = new Map();
  const counts = { backButton: 0, appStateChange: 0 };
  const App = {
    addListener: async (name, callback) => {
      counts[name] += 1;
      listeners.set(name, callback);
    },
    exitApp: () => {},
  };
  const game = {
    state: 'running',
    pause: () => { game.state = 'paused'; },
    resume: () => { game.state = 'running'; },
    goToMenu: () => { game.state = 'menu'; },
  };
  assert.equal(await installMobileListeners(game, App), true);
  assert.equal(await installMobileListeners(game, App), false);
  assert.deepEqual(counts, { backButton: 1, appStateChange: 1 });
  listeners.get('appStateChange')({ isActive: false });
  assert.equal(game.state, 'paused');
  listeners.get('backButton')();
  assert.equal(game.state, 'running');
});
