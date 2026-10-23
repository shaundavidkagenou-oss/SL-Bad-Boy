import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game } from '../src/game/Game.js';
import { RewardedAds, ADMOB_APP_ID, REWARDED_AD_UNIT_ID } from '../src/mobile/RewardedAds.js';

const EVENTS = {
  Loaded: 'loaded', FailedToLoad: 'failed-load', Rewarded: 'rewarded',
  Dismissed: 'dismissed', FailedToShow: 'failed-show',
};
const flush = () => new Promise((resolve) => setImmediate(resolve));

function fakeAdMob({ canRequestAds = true, failPrepare = false, returnReward = false } = {}) {
  const listeners = new Map();
  const calls = { consent: 0, initialize: 0, prepare: 0, show: 0 };
  const state = { canRequestAds, failPrepare };
  const AdMob = {
    requestConsentInfo: async () => {
      calls.consent += 1;
      return { status: 'NOT_REQUIRED', isConsentFormAvailable: false, canRequestAds: state.canRequestAds };
    },
    showConsentForm: async () => ({ canRequestAds: state.canRequestAds }),
    initialize: async () => { calls.initialize += 1; },
    prepareRewardVideoAd: async (options) => {
      calls.prepare += 1;
      assert.equal(options.adId, REWARDED_AD_UNIT_ID);
      assert.equal(options.isTesting, false);
      if (state.failPrepare) throw new Error('no fill');
      return { adUnitId: options.adId };
    },
    showRewardVideoAd: async (options) => {
      calls.show += 1;
      assert.equal(options.adId, REWARDED_AD_UNIT_ID);
      if (returnReward) return { type: 'revive', amount: 1 };
      return new Promise(() => {});
    },
    addListener: async (name, callback) => {
      listeners.set(name, callback);
      return { remove: async () => listeners.delete(name) };
    },
  };
  return {
    AdMob, RewardAdPluginEvents: EVENTS, calls, state,
    emit(name, payload = {}) {
      assert.ok(listeners.has(name), `listener ${name} is installed`);
      listeners.get(name)(payload);
    },
  };
}

function gameStub(show) {
  const score = { score: 900, distance: 123, coins: 4 };
  const calls = { consume: 0, respawn: 0, clear: 0, running: 0, messages: [] };
  const game = {
    completeRespawn: Game.prototype.completeRespawn,
    state: 'revive', revivePending: false, score, speed: 18,
    juice: { count: 0, consume: () => { calls.consume += 1; return true; } },
    rewardedAds: { supported: true, show },
    player: { respawn: () => { calls.respawn += 1; } },
    spawner: { prepareRespawn: () => { calls.clear += 1; } },
    police: { reset: () => {} }, cameraRig: { reset: () => {} }, effects: { reset: () => {} },
    audio: { setState: () => {} },
    ui: {
      setReviveAdPending: () => {}, setReviveAdMessage: (message) => calls.messages.push(message),
      showRunning: () => { calls.running += 1; }, setJuice: () => {}, updateHud: () => {}, showFeedback: () => {},
    },
  };
  return { game, score, calls };
}

test('supplied AdMob IDs are wired to the native manifest and production rewarded unit', () => {
  assert.equal(ADMOB_APP_ID, 'ca-app-pub-7175777292239029~3414423328');
  assert.equal(REWARDED_AD_UNIT_ID, 'ca-app-pub-7175777292239029/3200257177');
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
  const strings = readFileSync('android/app/src/main/res/values/strings.xml', 'utf8');
  assert.match(manifest, /com\.google\.android\.gms\.ads\.APPLICATION_ID/);
  assert.match(manifest, /@string\/admob_app_id/);
  assert.ok(strings.includes(ADMOB_APP_ID));
});

test('rewarded ad preloads once and grants only after reward plus dismissal', async () => {
  const fake = fakeAdMob();
  const ads = new RewardedAds({ supported: true, loadModule: async () => fake });
  assert.equal(await ads.initialize(), true);
  assert.deepEqual(fake.calls, { consent: 1, initialize: 1, prepare: 1, show: 0 });
  assert.equal(ads.status, 'ready');

  const showing = ads.show();
  await flush();
  assert.equal(fake.calls.show, 1);
  assert.equal(ads.status, 'showing');
  let settled = false;
  showing.then(() => { settled = true; });
  fake.emit(EVENTS.Rewarded, { type: 'revive', amount: 1 });
  await flush();
  assert.equal(settled, false, 'an earned reward does not resume gameplay behind the visible ad');
  fake.emit(EVENTS.Dismissed);
  assert.equal(await showing, true);
  await flush();
  assert.equal(fake.calls.prepare, 2, 'the next optional revive is preloaded');
  assert.equal(ads.status, 'ready');
});

test('dismissal without a reward never revives and stale rewards cannot leak into another ad', async () => {
  const fake = fakeAdMob();
  const ads = new RewardedAds({ supported: true, loadModule: async () => fake });
  await ads.initialize();
  const first = ads.show();
  await flush();
  fake.emit(EVENTS.Dismissed);
  assert.equal(await first, false);
  await flush();
  fake.emit(EVENTS.Rewarded, { type: 'revive', amount: 1 });
  const second = ads.show();
  await flush();
  fake.emit(EVENTS.Dismissed);
  assert.equal(await second, false, 'a late event from the prior session is ignored');
});

test('SDK reward promise is an equivalent valid reward signal but still waits for dismissal', async () => {
  const fake = fakeAdMob({ returnReward: true });
  const ads = new RewardedAds({ supported: true, loadModule: async () => fake });
  await ads.initialize();
  const showing = ads.show();
  await flush();
  assert.equal(ads.rewardEarned, true);
  fake.emit(EVENTS.Dismissed);
  assert.equal(await showing, true);
});

test('consent denial and ad-load failures never show an ad or issue a reward', async () => {
  const denied = fakeAdMob({ canRequestAds: false });
  const ads = new RewardedAds({ supported: true, loadModule: async () => denied });
  assert.equal(await ads.initialize(), false);
  assert.equal(ads.status, 'consent-required');
  assert.equal(denied.calls.initialize, 0);
  assert.equal(await ads.show(), false);
  assert.equal(denied.calls.show, 0);

  const noFill = fakeAdMob({ failPrepare: true });
  const retry = new RewardedAds({ supported: true, loadModule: async () => noFill });
  assert.equal(await retry.initialize(), false);
  assert.equal(retry.status, 'error');
  assert.equal(await retry.show(), false);
  assert.equal(noFill.calls.show, 0);
});

test('ad revive preserves score and juice, prevents double-taps and shares the safe respawn path', async () => {
  let finishAd;
  const { game, score, calls } = gameStub(() => new Promise((resolve) => { finishAd = resolve; }));
  const first = Game.prototype.reviveWithAd.call(game);
  assert.equal(game.revivePending, true);
  assert.equal(await Game.prototype.reviveWithAd.call(game), false, 'a second tap cannot open another ad');
  assert.equal(Game.prototype.finishRun.call(game), false, 'the run cannot end behind the ad');
  assert.equal(game.state, 'revive');
  finishAd(true);
  assert.equal(await first, true);
  assert.equal(game.state, 'running');
  assert.equal(game.score, score);
  assert.deepEqual(score, { score: 900, distance: 123, coins: 4 });
  assert.equal(calls.consume, 0, 'an ad revive does not consume juice');
  assert.equal(calls.respawn, 1);
  assert.equal(calls.clear, 1);
  assert.equal(calls.running, 1);
});

test('cancelled ad stays on revive and native support offers a second chance with zero juice', async () => {
  const { game, score, calls } = gameStub(async () => false);
  assert.equal(await Game.prototype.reviveWithAd.call(game), false);
  assert.equal(game.state, 'revive');
  assert.equal(game.revivePending, false);
  assert.equal(calls.respawn, 0);
  assert.equal(calls.messages.length, 1);
  assert.deepEqual(score, { score: 900, distance: 123, coins: 4 });

  let offered = null;
  const crashed = {
    state: 'running', juice: { count: 0 }, rewardedAds: { supported: true },
    shop: { save: () => {} }, player: { crash: () => {} }, audio: { setState: () => {} },
    ui: { showRevive: (count, ads) => { offered = { count, ads }; } },
  };
  Game.prototype.endRun.call(crashed);
  assert.equal(crashed.state, 'revive');
  assert.deepEqual(offered, { count: 0, ads: true });
});
