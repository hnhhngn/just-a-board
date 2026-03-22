import { getEffectiveTool, state } from './state.js';
import { wakeUp } from './engine.js';

let _panSession = null;

function beginPan(event) {
  state.isPanning = true;
  _panSession = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    startTargetX: state.targetX,
    startTargetY: state.targetY,
  };
}

export function initViewport(viewport, callbacks = {}) {
  viewport.addEventListener('mousedown', (event) => {
    const isMiddlePan = event.button === 1;
    const isShiftPan = event.button === 0 && event.shiftKey;
    const isSpacePan = event.button === 0 && state.isSpacePressed;
    const isToolPan = event.button === 0 && getEffectiveTool() === 'pan';

    if (!isMiddlePan && !isShiftPan && !isSpacePan && !isToolPan) return;

    event.preventDefault();
    beginPan(event);
    callbacks.onInteractionChange?.();
  });

  window.addEventListener('mousemove', (event) => {
    if (!_panSession) return;

    state.targetX = _panSession.startTargetX + (event.clientX - _panSession.startClientX);
    state.targetY = _panSession.startTargetY + (event.clientY - _panSession.startClientY);
    wakeUp();
  });

  window.addEventListener('mouseup', () => {
    const didPan = state.isPanning;
    state.isPanning = false;
    _panSession = null;
    if (didPan) callbacks.onInteractionChange?.();
  });

  viewport.addEventListener('wheel', (event) => {
    if (state.editingObject && state.editingObject.element.contains(event.target)) {
      return;
    }

    event.preventDefault();

    if (event.ctrlKey) {
      state.anchorMouseX = event.clientX;
      state.anchorMouseY = event.clientY;
      state.anchorWorldX = (state.anchorMouseX - state.currentX) / state.currentScale;
      state.anchorWorldY = (state.anchorMouseY - state.currentY) / state.currentScale;

      const delta = -event.deltaY * 0.001;
      state.targetScale = Math.min(Math.max(0.1, state.targetScale + delta), 5);
      state.isZooming = true;
    } else if (event.shiftKey) {
      state.targetX -= event.deltaY || event.deltaX;
    } else {
      state.targetX -= event.deltaX;
      state.targetY -= event.deltaY;
    }

    wakeUp();
  }, { passive: false });
}
