import { Capacitor } from '@capacitor/core';

// Public AdMob identifiers supplied for SL BAD BOY. These are not API secrets.
export const ADMOB_APP_ID = 'ca-app-pub-7175777292239029~3414423328';
export const REWARDED_AD_UNIT_ID = 'ca-app-pub-7175777292239029/3200257177';

const importAdMob = () => import('@capacitor-community/admob');

/**
 * Native rewarded-ad lifecycle. A revive is never granted for loading, opening
 * or dismissing an ad: the SDK must report a reward, and the ad must be closed.
 */
export class RewardedAds {
  constructor({ supported = Capacitor.isNativePlatform(), loadModule = importAdMob, onStatus = () => {} } = {}) {
    this.supported = supported;
    this.loadModule = loadModule;
    this.onStatus = onStatus;
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
    await this.adMob.addListener(events.FailedToLoad, () => {
      if (this.active) this.completeShow(false);
      else this.setStatus('error');
    });
    await this.adMob.addListener(events.Rewarded, () => {
      if (this.active) this.rewardEarned = true;
    });
    await this.adMob.addListener(events.Dismissed, () => {
      if (this.active) this.completeShow(this.rewardEarned);
    });
    await this.adMob.addListener(events.FailedToShow, () => {
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
      .catch(() => {
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
      let consent = await this.adMob.requestConsentInfo();
      if (consent.isConsentFormAvailable && consent.status === 'REQUIRED') {
        consent = await this.adMob.showConsentForm();
      }
      if (!consent.canRequestAds) {
        this.setStatus('consent-required');
        return false;
      }
      await this.adMob.initialize();
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
      await this.adMob.prepareRewardVideoAd({
        adId: REWARDED_AD_UNIT_ID,
        isTesting: false,
        immersiveMode: true,
      });
      if (!this.active) this.setStatus('ready');
      return true;
    })()
      .catch(() => {
        if (!this.active) this.setStatus('error');
        return false;
      })
      .finally(() => { this.preloading = null; });
    return this.preloading;
  }

  /** Resolve true only for an SDK-confirmed reward followed by ad dismissal. */
  async show() {
    if (!this.supported || this.active) return false;
    const ready = await this.initialize();
    if (!ready || this.active || this.status !== 'ready') return false;

    this.active = true;
    this.rewardEarned = false;
    this.setStatus('showing');
    const result = new Promise((resolve) => { this.sessionResolve = resolve; });

    // The plugin resolves this promise from its native reward callback. Keep
    // the event listener as the primary signal and this result as an equivalent
    // SDK-backed fallback; both only set one boolean and cannot grant twice.
    Promise.resolve()
      .then(() => this.adMob.showRewardVideoAd({ adId: REWARDED_AD_UNIT_ID }))
      .then((reward) => {
        if (this.active && reward) this.rewardEarned = true;
      })
      .catch(() => this.completeShow(false));
    return result;
  }

  completeShow(rewarded) {
    if (!this.active) return;
    const resolve = this.sessionResolve;
    const earned = Boolean(rewarded && this.rewardEarned);
    this.active = false;
    this.rewardEarned = false;
    this.sessionResolve = null;
    this.setStatus('idle');
    resolve?.(earned);
    // One prepared ad is consumed per showing. Preload the next optional revive.
    this.prepare();
  }
}
