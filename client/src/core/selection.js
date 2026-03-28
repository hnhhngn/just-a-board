import { state } from './state.js';

export function refreshSelectionStyles() {
  state.objects.forEach((obj) => {
    const isSelected = state.selectedObjects.has(obj);
    obj.element.classList.toggle('is-selected', isSelected);
    obj.element.classList.toggle('is-primary-selection', obj === state.primarySelection);
    obj.element.classList.toggle('is-hovered', obj === state.hoveredObject);
  });
}

export function getSelectedObjects() {
  return state.objects.filter((obj) => state.selectedObjects.has(obj));
}

export function isSelected(obj) {
  return state.selectedObjects.has(obj);
}

export function getPrimarySelection() {
  if (
    state.primarySelection &&
    state.selectedObjects.has(state.primarySelection) &&
    state.objects.includes(state.primarySelection)
  ) {
    return state.primarySelection;
  }

  const fallback = getSelectedObjects()[0] || null;
  state.primarySelection = fallback;
  return fallback;
}

export function clearSelection() {
  if (state.selectedObjects.size === 0 && !state.primarySelection) return;
  state.selectedObjects.clear();
  state.primarySelection = null;
  refreshSelectionStyles();
}

export function setHoveredObject(obj) {
  const next = obj && state.objects.includes(obj) ? obj : null;
  if (state.hoveredObject === next) return;
  state.hoveredObject = next;
  refreshSelectionStyles();
}

export function selectOnly(obj) {
  state.selectedObjects.clear();
  if (obj) state.selectedObjects.add(obj);
  state.primarySelection = obj || null;
  refreshSelectionStyles();
}

export function setSelection(objects, primarySelection = null) {
  const list = Array.isArray(objects) ? objects.filter(Boolean) : [];
  state.selectedObjects = new Set(list);
  state.primarySelection = primarySelection && state.selectedObjects.has(primarySelection)
    ? primarySelection
    : (list[0] || null);
  refreshSelectionStyles();
}

export function toggleSelection(obj) {
  if (!obj) return;
  if (state.selectedObjects.has(obj)) {
    state.selectedObjects.delete(obj);
    if (state.primarySelection === obj) {
      const ordered = getSelectedObjects();
      state.primarySelection = ordered[ordered.length - 1] || null;
    }
  } else {
    state.selectedObjects.add(obj);
    state.primarySelection = obj;
  }
  refreshSelectionStyles();
}

export function selectAll() {
  setSelection(state.objects, state.objects[state.objects.length - 1] || null);
}
