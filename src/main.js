import './styles.css';
import '@fontsource/noto-sans-sinhala/sinhala-700.css';
import '@fontsource/noto-sans-tamil/tamil-700.css';
import { Game } from './game/Game.js';
import { loadSignFonts } from './ui/SignFonts.js';
import { prepareMobilePlatform, initializeMobilePlatform, hideNativeSplash } from './mobile/MobilePlatform.js';

prepareMobilePlatform();

const STUDIO_LOAD_DURATION = 5000;
const studio = document.getElementById('studio-loading');
const progressBar = document.getElementById('studio-progress-bar');
const percent = document.getElementById('studio-percent');
const status = document.getElementById('studio-status');
let loadingFrame = 0;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function startStudioProgress(startedAt) {
  let previousPercent = -1;
  let previousStatus = '';
  const update = (now) => {
    const progress = Math.min(1, (now - startedAt) / STUDIO_LOAD_DURATION);
    const currentPercent = Math.floor(progress * 100);
    if (currentPercent !== previousPercent) {
      percent.textContent = `${String(currentPercent).padStart(3, '0')}%`;
      progressBar.style.transform = `scaleX(${progress})`;
      previousPercent = currentPercent;
    }
    const message = progress >= 1 ? 'WELCOME TO SL BAD BOY'
      : progress >= 0.75 ? 'READY FOR TAKEOFF'
        : progress >= 0.5 ? 'CALLING THE PURSUIT'
          : progress >= 0.25 ? 'BUILDING THE STREETS' : 'IGNITING THE ISLAND';
    if (message !== previousStatus) {
      status.textContent = message;
      previousStatus = message;
    }
    if (progress < 1) loadingFrame = requestAnimationFrame(update);
  };
  loadingFrame = requestAnimationFrame(update);
}

async function bootstrap() {
  const startedAt = performance.now();
  studio.dataset.minDuration = String(STUDIO_LOAD_DURATION);
  studio.dataset.state = 'loading';
  startStudioProgress(startedAt);

  await loadSignFonts();
  const remaining = STUDIO_LOAD_DURATION - (performance.now() - startedAt);
  if (remaining > 0) await wait(remaining);

  const game = new Game(document.getElementById('scene'));
  await initializeMobilePlatform(game);
  if (import.meta.env.DEV) {
    window.__SL_BAD_BOY__ = game;
    window.__LANKA_RUN__ = game;
  }
  cancelAnimationFrame(loadingFrame);
  progressBar.style.transform = 'scaleX(1)';
  percent.textContent = '100%';
  studio.dataset.duration = String(performance.now() - startedAt);
  studio.dataset.state = 'done';
  studio.hidden = true;
  await hideNativeSplash();
}

bootstrap().catch(async (error) => {
  cancelAnimationFrame(loadingFrame);
  studio.hidden = true;
  console.error('SL BAD BOY could not initialize:', error);
  document.getElementById('fatal-error').hidden = false;
  document.body.dataset.gameState = 'error';
  await hideNativeSplash();
});
