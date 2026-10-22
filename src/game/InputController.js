const KEY_ACTIONS = Object.freeze({
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Space: 'jump', ArrowDown: 'slide', KeyS: 'slide', Escape: 'pause', Enter: 'confirm',
});

export class InputController {
  constructor(onAction, target = window) {
    this.onAction = onAction;
    this.target = target;
    this.touchTarget = null;
    this.handleKeyDown = (event) => {
      const action = KEY_ACTIONS[event.code];
      if (!action) return;
      event.preventDefault();
      if (event.repeat) return;
      this.onAction(action);
    };
    target.addEventListener('keydown', this.handleKeyDown, { passive: false });
  }

  attachTouch(element) {
    if (this.touchTarget === element) return;
    this.touchTarget = element;
    this.gesture = null;
    this.handlePointerDown = (event) => {
      if (event.pointerType === 'mouse') return;
      this.gesture = { x: event.clientX, y: event.clientY, id: event.pointerId };
      element.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    this.handlePointerMove = (event) => {
      if (this.gesture) event.preventDefault();
    };
    this.handlePointerUp = (event) => {
      if (!this.gesture || this.gesture.id !== event.pointerId) return;
      const dx = event.clientX - this.gesture.x;
      const dy = event.clientY - this.gesture.y;
      this.gesture = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) this.onAction(dx < 0 ? 'left' : 'right');
      else this.onAction(dy < 0 ? 'jump' : 'slide');
      event.preventDefault();
    };
    this.handlePointerCancel = () => { this.gesture = null; };
    element.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    element.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    element.addEventListener('pointerup', this.handlePointerUp, { passive: false });
    element.addEventListener('pointercancel', this.handlePointerCancel);
  }

  destroy() {
    this.target.removeEventListener('keydown', this.handleKeyDown);
    if (this.touchTarget) {
      this.touchTarget.removeEventListener('pointerdown', this.handlePointerDown);
      this.touchTarget.removeEventListener('pointermove', this.handlePointerMove);
      this.touchTarget.removeEventListener('pointerup', this.handlePointerUp);
      this.touchTarget.removeEventListener('pointercancel', this.handlePointerCancel);
    }
  }
}
