import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('mobile HUD removes bottom control buttons while direct swipe gestures remain', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/ui/GameUI.js', import.meta.url), 'utf8');
  const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
  const input = readFileSync(new URL('../src/game/InputController.js', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /id="touch-controls"/);
  assert.doesNotMatch(ui, /touch-controls|button\[data-action\]/);
  assert.doesNotMatch(styles, /\.touch-controls|\.touch-control-group/);
  assert.match(html, /Swipe left or right to change lanes/);
  assert.match(input, /pointerdown/);
  assert.match(input, /pointerup/);
  assert.match(input, /event\.pointerType === 'mouse'/);
});
