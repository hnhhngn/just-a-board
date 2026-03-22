import { state } from '../state.js';
import { wakeUp } from '../engine.js';
import { updateObjectInGrid } from '../grid.js';
import { ResizeObjectCmd } from '../commands/ResizeObjectCmd.js';
import { getPrimarySelection, getSelectedObjects } from '../selection.js';

const HANDLE_NAMES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const MIN_SIZE = 40;

function getHandleMarkup(objectIndex) {
  return HANDLE_NAMES.map((name) => (
    `<button class="selection-handle handle-${name}" data-handle="${name}" data-object-index="${objectIndex}"></button>`
  )).join('');
}

function clampRect(rect) {
  return {
    x: rect.x,
    y: rect.y,
    width: Math.max(MIN_SIZE, rect.width),
    height: Math.max(MIN_SIZE, rect.height),
  };
}

function getObjectRect(obj) {
  return {
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
  };
}

function getElementScreenRect(obj) {
  const rect = obj.element.getBoundingClientRect();
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function initSelectionOverlay(commandManager) {
  const overlay = document.createElement('div');
  overlay.className = 'selection-overlay';
  overlay.innerHTML = `
    <div class="selection-box hover-box" id="hoverBox"></div>
    <div class="selection-boxes" id="selectionBoxes"></div>
    <div class="selection-box active-box" id="selectionBox">
      ${getHandleMarkup('')}
    </div>
    <div class="selection-box marquee-box" id="marqueeBox"></div>
  `;
  document.body.appendChild(overlay);

  const hoverBox = overlay.querySelector('#hoverBox');
  const boxesLayer = overlay.querySelector('#selectionBoxes');
  const box = overlay.querySelector('#selectionBox');
  const marqueeBox = overlay.querySelector('#marqueeBox');
  const handles = box.querySelectorAll('.selection-handle');
  const multiBoxes = new Map();

  let resizeSession = null;

  function setDisplay(target, display) {
    if (target.style.display !== display) {
      target.style.display = display;
    }
  }

  function setStylePx(target, property, value) {
    const nextValue = `${value}px`;
    if (target.style[property] !== nextValue) {
      target.style[property] = nextValue;
    }
  }

  function hideBox(target) {
    setDisplay(target, 'none');
  }

  function showBox(target, rect) {
    setDisplay(target, 'block');
    setStylePx(target, 'left', rect.left);
    setStylePx(target, 'top', rect.top);
    setStylePx(target, 'width', rect.width);
    setStylePx(target, 'height', rect.height);
  }

  function clearMultiBoxes() {
    multiBoxes.forEach((multiBox) => {
      multiBox.remove();
    });
    multiBoxes.clear();
  }

  function createMultiBox() {
    const multiBox = document.createElement('div');
    multiBox.className = 'selection-box multi-box';
    multiBox.innerHTML = getHandleMarkup('');
    return multiBox;
  }

  function syncMultiBoxHandles(multiBox, objectIndex, canResize) {
    multiBox.querySelectorAll('.selection-handle').forEach((handle) => {
      const nextIndex = String(objectIndex);
      const nextDisplay = canResize ? 'block' : 'none';

      if (handle.dataset.objectIndex !== nextIndex) {
        handle.dataset.objectIndex = nextIndex;
      }

      if (handle.style.display !== nextDisplay) {
        handle.style.display = nextDisplay;
      }
    });
  }

  function syncMultiBoxes(selected, canResize) {
    const selectedSet = new Set(selected);

    multiBoxes.forEach((multiBox, obj) => {
      if (!selectedSet.has(obj)) {
        multiBox.remove();
        multiBoxes.delete(obj);
      }
    });

    selected.forEach((obj, index) => {
      let multiBox = multiBoxes.get(obj);
      if (!multiBox) {
        multiBox = createMultiBox();
        multiBoxes.set(obj, multiBox);
      }

      const rect = getElementScreenRect(obj);
      const objectIndex = state.objects.indexOf(obj);

      multiBox.classList.toggle('resizable', canResize);
      multiBox.classList.toggle('dragging', state.isDraggingSelection);
      showBox(multiBox, rect);
      syncMultiBoxHandles(multiBox, objectIndex, canResize);

      const desiredPosition = boxesLayer.children[index] || null;
      if (desiredPosition !== multiBox) {
        boxesLayer.insertBefore(multiBox, desiredPosition);
      }
    });
  }

  function render() {
    const selected = getSelectedObjects();
    const primary = getPrimarySelection();
    const canResize = !state.editingObject && state.activeTool === 'select';
    const marqueeRect = state.marqueeRect;
    const hovered = state.activeTool === 'select' && !state.editingObject && !state.isPanning && !marqueeRect
      ? state.hoveredObject
      : null;
    const hasOverlayContent = selected.length > 0 || hovered || marqueeRect;

    hideBox(hoverBox);
    hideBox(marqueeBox);

    if (!hasOverlayContent) {
      overlay.classList.remove('visible');
      clearMultiBoxes();
      hideBox(box);
      requestAnimationFrame(render);
      return;
    }

    overlay.classList.add('visible');

    if (marqueeRect) {
      showBox(marqueeBox, marqueeRect);
    }

    if (selected.length === 0) {
      clearMultiBoxes();
      hideBox(box);

      if (hovered && !state.selectedObjects.has(hovered)) {
        showBox(hoverBox, getElementScreenRect(hovered));
      }

      requestAnimationFrame(render);
      return;
    }

    if (selected.length === 1) {
      const normalizedPrimary = primary && selected.includes(primary) ? primary : selected[0];
      if (!normalizedPrimary) {
        overlay.classList.remove('visible');
        boxesLayer.innerHTML = '';
        hideBox(box);
        requestAnimationFrame(render);
        return;
      }

      const screen = getElementScreenRect(normalizedPrimary);
      const objectIndex = state.objects.indexOf(normalizedPrimary);

      clearMultiBoxes();
      showBox(box, screen);
      box.classList.toggle('single', canResize);
      box.classList.toggle('dragging', state.isDraggingSelection);

      handles.forEach((handle) => {
        handle.dataset.objectIndex = String(objectIndex);
        handle.style.display = canResize ? 'block' : 'none';
      });

      requestAnimationFrame(render);
      return;
    }

    hideBox(box);
    box.classList.remove('single');
    box.classList.remove('dragging');
    handles.forEach((handle) => {
      handle.dataset.objectIndex = '';
      handle.style.display = 'none';
    });
    syncMultiBoxes(selected, canResize);

    requestAnimationFrame(render);
  }

  function applyResize(handleName, dx, dy) {
    const next = { ...resizeSession.beforeRect };

    if (handleName.includes('w')) {
      next.x += dx;
      next.width -= dx;
    }

    if (handleName.includes('e')) {
      next.width += dx;
    }

    if (handleName.includes('n')) {
      next.y += dy;
      next.height -= dy;
    }

    if (handleName.includes('s')) {
      next.height += dy;
    }

    const clamped = clampRect(next);

    if (handleName.includes('w') && clamped.width === MIN_SIZE) {
      clamped.x = resizeSession.beforeRect.x + resizeSession.beforeRect.width - MIN_SIZE;
    }

    if (handleName.includes('n') && clamped.height === MIN_SIZE) {
      clamped.y = resizeSession.beforeRect.y + resizeSession.beforeRect.height - MIN_SIZE;
    }

    resizeSession.obj.setPosition(clamped.x, clamped.y);
    resizeSession.obj.setSize(clamped.width, clamped.height);
    resizeSession.obj.updateSize();
    updateObjectInGrid(resizeSession.obj);
    wakeUp();
  }

  overlay.addEventListener('mousedown', (event) => {
    const handle = event.target.closest('.selection-handle');
    if (!handle || state.editingObject || state.activeTool !== 'select') return;

    const objectIndex = Number(handle.dataset.objectIndex);
    const obj = Number.isInteger(objectIndex) && objectIndex >= 0 ? state.objects[objectIndex] : null;
    if (!obj || !state.selectedObjects.has(obj)) return;

    event.preventDefault();
    event.stopPropagation();

    resizeSession = {
      handle: handle.dataset.handle,
      obj,
      beforeRect: getObjectRect(obj),
      startClientX: event.clientX,
      startClientY: event.clientY,
    };
  });

  window.addEventListener('mousemove', (event) => {
    if (!resizeSession) return;

    const dx = (event.clientX - resizeSession.startClientX) / state.currentScale;
    const dy = (event.clientY - resizeSession.startClientY) / state.currentScale;
    applyResize(resizeSession.handle, dx, dy);
  });

  window.addEventListener('mouseup', () => {
    if (!resizeSession) return;

    const afterRect = getObjectRect(resizeSession.obj);
    const beforeRect = resizeSession.beforeRect;

    if (
      beforeRect.x !== afterRect.x ||
      beforeRect.y !== afterRect.y ||
      beforeRect.width !== afterRect.width ||
      beforeRect.height !== afterRect.height
    ) {
      commandManager.record(new ResizeObjectCmd(resizeSession.obj, beforeRect, afterRect));
    }

    resizeSession = null;
  });

  requestAnimationFrame(render);

  return {
    destroy() {
      overlay.remove();
    },
  };
}
