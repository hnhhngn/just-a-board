import { state } from '../core/state.js';
import { wakeUp } from '../core/engine.js';

export function screenToWorld(clientX, clientY) {
  return {
    x: (clientX - state.currentX) / state.currentScale,
    y: (clientY - state.currentY) / state.currentScale,
  };
}

export function getViewportCenterWorld() {
  return screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
}

export function getObjectsBounds(objects) {
  const list = Array.isArray(objects) ? objects.filter(Boolean) : [];
  if (list.length === 0) return null;

  const left = Math.min(...list.map((obj) => obj.x));
  const top = Math.min(...list.map((obj) => obj.y));
  const right = Math.max(...list.map((obj) => obj.x + obj.width));
  const bottom = Math.max(...list.map((obj) => obj.y + obj.height));

  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    centerX: left + (right - left) / 2,
    centerY: top + (bottom - top) / 2,
  };
}

export function zoomToObject(obj) {
  if (!obj) return;

  const padding = 64;
  const availableWidth = Math.max(200, window.innerWidth - padding * 2);
  const availableHeight = Math.max(200, window.innerHeight - padding * 2);
  const scale = Math.min(
    5,
    Math.max(
      0.1,
      Math.min(
        availableWidth / Math.max(1, obj.width),
        availableHeight / Math.max(1, obj.height),
      ),
    ),
  );

  state.targetScale = scale;
  state.targetX = window.innerWidth / 2 - (obj.x + obj.width / 2) * scale;
  state.targetY = window.innerHeight / 2 - (obj.y + obj.height / 2) * scale;
  wakeUp();
}
