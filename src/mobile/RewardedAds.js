import { Capacitor } from '@capacitor/core';

// Public AdMob identifiers supplied for SL BAD BOY. These are not API secrets.
export const ADMOB_APP_ID = 'ca-app-pub-7175777292239029~3414423328';
export const REWARDED_AD_UNIT_ID = 'ca-app-pub-7175777292239029/3200257177';

const importAdMob = () => import('@capacitor-community/admob');
const DEFAULT_TIMEOUTS = { consent: 15000, initialize: 15000, load: 25000, showStart: 12000 };

async function withTimeout(operation, milliseconds, label) {
  let timer;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const error = new Error(label);
          error.code = 'TIMEOUT';
          reject(error);
        }, milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function errorFeedback(error, stage = 'load') {
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? error ?? '');
  if (code === '2' || /network|internet|connection/i.test(message)) {
    return 'AD NETWORK ERROR • CHECK INTERNET & TAP TO RETRY';
  }
  if (code === '3' || /no.fill|no ad/i.test(message)) {
    return 'NO AD AVAILABLE YET • PLEASE TRY AGAIN LATER';
  }
  if (code === 'TIMEOUT') return 'AD TOOK TOO LONG • CHECK INTERNET & TAP TO RETRY';
  return stage === 'show' ? 'AD COULD NOT OPEN • TAP TO RETRY' : 'AD COULD NOT LOAD • TAP TO RETRY';
}

/**
 * Native rewarded-ad lifecycle. A revive is never granted for loading, opening
 * or dismissing an ad: the SDK must report a reward, and the ad must be closed.
 */
export class RewardedAds {
  constructor({
    supported = Capacitor.isNativePlatform(), loadModule = importAdMob, onStatus = () => {},
    timeouts = DEFAULT_TIMEOUTS,
  } = {}) {
    this.supported = supported;
    this.loadModule = loadModule;
    this.onStatus = onStatus;
    this.timeouts = { ...DEFAULT_TIMEOUTS, ...timeouts };
    this.status = supported ? 'idle' : 'unsupported';
    this.adMob = null;
    this.events = null;
    this.sdkReady = false;
    this.listenersInstalled = false;
    this.initializing = null;
    this.preloading = null;
    this.active = false;
    this.rewardEarned = false;
    this.sessionResolve = null;
    this.presented = false;
    this.showStartTimer = null;
    this.lastError = null;
    this.feedback = '';
  }

  recordError(error, stage = 'load') {
    this.lastError = error;
    this.feedback = errorFeedback(error, stage);
    const code = error?.code === undefined ? '' : ` (code ${error.code})`;
    const message = error?.message || String(error || 'Unknown AdMob error');
    console.error(`[AdMob] ${stage} failed${code}: ${message}`);
  }

  getFeedback() {
    return this.feedback;
  }

  setStatus(status) {
    if (this.status === status) return;
    this.status = status;
    this.onStatus(status);
  }

  async installListeners() {
    if (this.listenersInstalled) return;
    const events = this.events;
    await this.adMob.addListener(events.Loaded, () => {
      if (!this.active) this.setStatus('ready');
    });
    await this.adMob.addListener(events.Showed, () => {
      if (!this.active) return;
      this.presented = true;
      clearTimeout(this.showStartTimer);
      this.showStartTimer = null;
    });
    await this.adMob.addListener(events.FailedToLoad, (error) => {
      this.recordError(error, this.active ? 'show' : 'load');
      if (this.active) this.completeShow(false);
      else this.setStatus('error');
    });
    await this.adMob.addListener(events.Rewarded, () => {
      if (this.active) this.rewardEarned = true;
    });
    await this.adMob.addListener(events.Dismissed, () => {
      if (this.active) this.completeShow(this.rewardEarned);
    });
    await this.adMob.addListener(events.FailedToShow, (error) => {
      this.recordError(error, 'show');
      if (this.active) this.completeShow(false);
      else this.setStatus('error');
    });
    this.listenersInstalled = true;
  }

  initialize() {
    if (!this.supported) return Promise.resolve(false);
    if (this.status === 'ready' && this.sdkReady) return Promise.resolve(true);
    if (this.initializing) return this.initializing;
    this.initializing = this.initializeInternal()
      .catch((error) => {
        this.recordError(error, 'initialization');
        this.setStatus('error');
        return false;
      })
      .finally(() => { this.initializing = null; });
    return this.initializing;
  }

  async initializeInternal() {
    if (!this.adMob) {
      const module = await this.loadModule();
      this.adMob = module.AdMob;
      this.events = module.RewardAdPluginEvents;
    }

    if (!this.sdkReady) {
      this.setStatus('consent');
      let consent = await withTimeout(
        this.adMob.requestConsentInfo(), this.timeouts.consent, 'AdMob consent request timed out',
      );
      if (consent.isConsentFormAvailable && consent.status === 'REQUIRED') {
        consent = await withTimeout(
          this.adMob.showConsentForm(), this.timeouts.consent, 'AdMob consent form timed out',
        );
      }
      if (!consent.canRequestAds) {
        this.feedback = 'ADS UNAVAILABLE WITH CURRENT PRIVACY CHOICE';
        this.setStatus('consent-required');
        return false;
      }
      await withTimeout(this.adMob.initialize(), this.timeouts.initialize, 'AdMob initialization timed out');
      this.sdkReady = true;
    }

    await this.installListeners();
    if (this.active) return true;
    return this.prepare();
  }

  prepare() {
    if (!this.supported || !this.sdkReady) return Promise.resolve(false);
    if (this.status === 'ready') return Promise.resolve(true);
    if (this.preloading) return this.preloading;
    this.preloading = (async () => {
      this.setStatus('loading');
      await withTimeout(this.adMob.prepareRewardVideoAd({
        adId: REWARDED_AD_UNIT_ID,
        isTesting: false,
        immersiveMode: true,
      }), this.timeouts.load, 'Rewarded ad loading timed out');
      if (!this.active) this.setStatus('ready');
      return true;
    })()
      .catch((error) => {
        this.recordError(error, 'load');
        if (!this.active) this.setStatus('error');
        return false;
      })
      .finally(() => { this.preloading = null; });
    return this.preloading;
  }

  /** Resolve true only for an SDK-confirmed reward followed by ad dismissal. */
  async show() {
    if (!this.supported || this.active) return false;
    this.lastError = null;
    this.feedback = '';
    const ready = await this.initialize();
    if (!ready || this.active || this.status !== 'ready') {
      if (!this.feedback) this.feedback = 'AD IS NOT READY • TAP TO RETRY';
      return false;
    }

    this.active = true;
    this.presented = false;
    this.rewardEarned = false;
    this.setStatus('showing');
    const result = new Promise((resolve) => { this.sessionResolve = resolve; });
    this.showStartTimer = setTimeout(() => {
      if (!this.active || this.presented) return;
      const error = new Error('Rewarded ad did not open in time');
      error.code = 'TIMEOUT';
      this.recordError(error, 'show');
      this.completeShow(false);
    }, this.timeouts.showStart);

    // The plugin resolves this promise from its native reward callback. Keep
    // the event listener as the primary signal and this result as an equivalent
    // SDK-backed fallback; both only set one boolean and cannot grant twice.
    Promise.resolve()
      .then(() => this.adMob.showRewardVideoAd({ adId: REWARDED_AD_UNIT_ID }))
      .then((reward) => {
        if (this.active && reward) this.rewardEarned = true;
      })
      .catch((error) => {
        this.recordError(error, 'show');
        this.completeShow(false);
      });
    return result;
  }

  completeShow(rewarded) {
    if (!this.active) return;
    const resolve = this.sessionResolve;
    const earned = Boolean(rewarded && this.rewardEarned);
    clearTimeout(this.showStartTimer);
    this.showStartTimer = null;
    this.presented = false;
    this.active = false;
    this.rewardEarned = false;
    this.sessionResolve = null;
    if (!earned && !this.feedback) this.feedback = 'AD NOT COMPLETED • WATCH TO THE END TO CONTINUE';
    this.setStatus('idle');
    resolve?.(earned);
    // One prepared ad is consumed per showing. Preload the next optional revive.
    this.prepare();
  }
}
