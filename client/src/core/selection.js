import { state } from './state.js';

// --- SELECTION CACHE ---
let _selectedCache = [];
let _selectedCacheDirty = true;

/**
 * Invalidate cache khi state.objects hoặc selectedObjects mutate.
 * Phải gọi từ layerManager khi insert/remove/reorder objects.
 */
export function invalidateSelectionCache() {
  _selectedCacheDirty = true;
}

// --- THÔNG BÁO OVERLAY ---
let _onSelectionChange = null;

/**
 * Đăng ký callback khi selection thay đổi (dùng để invalidate SelectionOverlay).
 */
export function onSelectionChange(callback) {
  _onSelectionChange = callback;
}

function notifySelectionChange() {
  if (_onSelectionChange) _onSelectionChange();
}

// --- STYLE SYNC ---

/**
 * Cập nhật CSS classes cho danh sách objects cụ thể.
 * Nếu không truyền tham số → fallback duyệt toàn bộ (dùng khi reorder).
 */
export function refreshSelectionStyles(changedObjects = null) {
  const toUpdate = changedObjects || state.objects;
  for (const obj of toUpdate) {
    if (!obj || !obj.element) continue;
    obj.element.classList.toggle('is-selected', state.selectedObjects.has(obj));
    obj.element.classList.toggle('is-primary-selection', obj === state.primarySelection);
    obj.element.classList.toggle('is-hovered', obj === state.hoveredObject);
  }
}

// --- QUERIES ---

export function getSelectedObjects() {
  if (_selectedCacheDirty) {
    _selectedCache = state.objects.filter((obj) => state.selectedObjects.has(obj));
    _selectedCacheDirty = false;
  }
  return _selectedCache;
}

export function isSelected(obj) {
  return state.selectedObjects.has(obj);
}

export function getPrimarySelection() {
  if (
    state.primarySelection &&
    state.selectedObjects.has(state.primarySelection) &&
    state.primarySelection.element?.isConnected
  ) {
    return state.primarySelection;
  }

  const fallback = getSelectedObjects()[0] || null;
  state.primarySelection = fallback;
  return fallback;
}

// --- MUTATIONS ---

export function clearSelection() {
  if (state.selectedObjects.size === 0 && !state.primarySelection) return;
  const previouslySelected = [...state.selectedObjects];
  state.selectedObjects.clear();
  state.primarySelection = null;
  _selectedCacheDirty = true;
  refreshSelectionStyles(previouslySelected);
  notifySelectionChange();
}

export function setHoveredObject(obj) {
  // Dùng isConnected O(1) thay vì includes O(n)
  const next = obj && obj.element?.isConnected ? obj : null;
  if (state.hoveredObject === next) return;
  const prev = state.hoveredObject;
  state.hoveredObject = next;
  // Chỉ toggle class trên 2 objects thay đổi — không duyệt toàn bộ
  refreshSelectionStyles([prev, next].filter(Boolean));
  notifySelectionChange();
}

export function selectOnly(obj) {
  const previouslySelected = [...state.selectedObjects];
  state.selectedObjects.clear();
  if (obj) state.selectedObjects.add(obj);
  state.primarySelection = obj || null;
  _selectedCacheDirty = true;
  // Cập nhật cả objects cũ (bỏ chọn) + object mới (chọn)
  const changed = obj ? [...previouslySelected, obj] : previouslySelected;
  refreshSelectionStyles(changed);
  notifySelectionChange();
}

export function setSelection(objects, primarySelection = null) {
  const list = Array.isArray(objects) ? objects.filter(Boolean) : [];
  const previouslySelected = [...state.selectedObjects];
  state.selectedObjects = new Set(list);
  state.primarySelection = primarySelection && state.selectedObjects.has(primarySelection)
    ? primarySelection
    : (list[0] || null);
  _selectedCacheDirty = true;
  // Cập nhật union: objects cũ (bỏ chọn) + objects mới (chọn)
  const allChanged = [...new Set([...previouslySelected, ...list])];
  refreshSelectionStyles(allChanged);
  notifySelectionChange();
}

export function toggleSelection(obj) {
  if (!obj) return;
  if (state.selectedObjects.has(obj)) {
    state.selectedObjects.delete(obj);
    if (state.primarySelection === obj) {
      _selectedCacheDirty = true;
      const ordered = getSelectedObjects();
      state.primarySelection = ordered[ordered.length - 1] || null;
    }
  } else {
    state.selectedObjects.add(obj);
    state.primarySelection = obj;
  }
  _selectedCacheDirty = true;
  refreshSelectionStyles([obj]);
  notifySelectionChange();
}

export function selectAll() {
  setSelection(state.objects, state.objects[state.objects.length - 1] || null);
}
