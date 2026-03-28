import { state } from './state.js';
import { wakeUp } from './engine.js';
import { addObjectToGrid, removeObjectFromGrid, updateObjectInGrid, currentlyVisibleObjects } from './grid.js';
import { refreshSelectionStyles } from './selection.js';

let _world = null;

export function initObjectStore(world) {
  _world = world;
}

function ensureWorld() {
  if (!_world) throw new Error('Object store chưa được khởi tạo world');
}

export function syncObjectOrder() {
  state.objects.forEach((obj, index) => {
    obj.element.style.zIndex = String(index + 1);
  });
  state.objectsVersion += 1;
}

export function insertObjects(objects, index = state.objects.length) {
  ensureWorld();

  const list = Array.isArray(objects) ? objects.filter(Boolean) : [objects].filter(Boolean);
  if (list.length === 0) return;

  const targetIndex = Number.isFinite(index) ? index : state.objects.length;
  const safeIndex = Math.max(0, Math.min(targetIndex, state.objects.length));
  state.objects.splice(safeIndex, 0, ...list);

  list.forEach((obj) => {
    if (!obj.element.isConnected) {
      obj.attachTo(_world, () => updateObjectInGrid(obj));
    }
    addObjectToGrid(obj);
    currentlyVisibleObjects.add(obj);
  });

  syncObjectOrder();
  refreshSelectionStyles();
  wakeUp();
}

export function restoreObjectEntries(entries) {
  ensureWorld();
  const sorted = [...entries].sort((a, b) => a.index - b.index);
  sorted.forEach(({ obj, index }) => {
    const safeIndex = Math.max(0, Math.min(index, state.objects.length));
    state.objects.splice(safeIndex, 0, obj);
    if (!obj.element.isConnected) {
      obj.attachTo(_world, () => updateObjectInGrid(obj));
    }
    addObjectToGrid(obj);
    currentlyVisibleObjects.add(obj);
  });

  syncObjectOrder();
  refreshSelectionStyles();
  wakeUp();
}

export function removeObjects(objects) {
  const list = Array.isArray(objects) ? objects.filter(Boolean) : [objects].filter(Boolean);
  if (list.length === 0) return [];

  const entries = list
    .map((obj) => ({ obj, index: state.objects.indexOf(obj) }))
    .filter((entry) => entry.index !== -1)
    .sort((a, b) => a.index - b.index);

  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const { obj, index } = entries[i];
    state.objects.splice(index, 1);
    state.selectedObjects.delete(obj);
    if (state.primarySelection === obj) {
      state.primarySelection = null;
    }
    obj.detach();
    removeObjectFromGrid(obj);
    currentlyVisibleObjects.delete(obj);
  }

  if (!state.primarySelection && state.selectedObjects.size > 0) {
    state.primarySelection = state.objects.find((obj) => state.selectedObjects.has(obj)) || null;
  }

  syncObjectOrder();
  refreshSelectionStyles();
  wakeUp();
  return entries;
}

export function clearObjects() {
  const entries = state.objects.map((obj, index) => ({ obj, index }));
  removeObjects(entries.map((entry) => entry.obj));
  return entries;
}

export function setObjectOrder(order) {
  state.objects.length = 0;
  state.objects.push(...order);
  syncObjectOrder();
  refreshSelectionStyles();
  wakeUp();
}
