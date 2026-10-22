import { Capacitor } from '@capacitor/core';

let initialized = false;

export function prepareMobilePlatform() {
  if (!Capacitor.isNativePlatform()) return false;
  document.body.classList.add('native-mobile');
  document.body.dataset.platform = Capacitor.getPlatform();
  return true;
}

export function handleNativeBack(game, exitApp) {
  if (game.state === 'running') game.pause();
  else if (game.state === 'paused') game.resume();
  else if (game.state === 'gameover') game.goToMenu();
  else exitApp();
}

export async function installMobileListeners(game, App) {
  if (initialized) return false;
  initialized = true;
  await App.addListener('backButton', () => handleNativeBack(game, () => App.exitApp()));
  await App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive && game.state === 'running') game.pause();
  });
  return true;
}

/** Native Android lifecycle and hardware-back behavior. Never installed twice. */
export async function initializeMobilePlatform(game) {
  if (initialized || !Capacitor.isNativePlatform()) return false;
  const { App } = await import('@capacitor/app');
  return installMobileListeners(game, App);
}

export async function hideNativeSplash() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    // The in-game loading screen remains usable if the native splash is absent.
  }
}
