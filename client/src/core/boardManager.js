import { state } from './state.js';
import { deserialize, serializeDraft, serializeForSave } from '../services/storage/BoardSerializer.js';
import { clearDraft, listDirtyBoardIds, loadDraft, saveDraft } from '../services/storage/DraftStore.js';
import { getIndex, create, remove, save, load, rename } from '../services/storage/index.js';
import { clearGrid } from './grid.js';
import { clearObjects, insertObjects } from './layerManager.js';
import { clearSelection } from './selection.js';
import { notify } from '../components/overlays/ToastManager.js';

const DRAFT_PERSIST_DELAY = 250;

let draftPersistTimer = null;
let suppressDirtySync = false;
let transientEditDirty = false;
let _deps = null;

export function initBoardManager(deps) {
  _deps = deps;
}

export function setTransientEditDirty(isDirty) {
  transientEditDirty = isDirty;
}

export function syncCurrentBoardDirty() {
  if (!state.currentBoardId) return;

  const isDirty = _deps.commandManager.isDirty() || transientEditDirty;
  if (isDirty) {
    state.dirtyBoardIds.add(state.currentBoardId);
  } else {
    state.dirtyBoardIds.delete(state.currentBoardId);
  }

  refreshDirtyBoards();
  updateTitle();
}

export function refreshDirtyBoards() {
  state.hasUnsavedChanges = state.currentBoardId
    ? state.dirtyBoardIds.has(state.currentBoardId)
    : false;

  if (_deps.sidebar?.setDirtyBoards) _deps.sidebar.setDirtyBoards([...state.dirtyBoardIds]);
  if (_deps.sidebar?.setDirtyIndicator) _deps.sidebar.setDirtyIndicator(state.hasUnsavedChanges);
  if (_deps.bottomBar?.setDirtyIndicator) _deps.bottomBar.setDirtyIndicator(state.hasUnsavedChanges);
}

function collectDraftAssetIds(snapshot) {
  try {
    const items = JSON.parse(snapshot);
    return items
      .filter((item) => item.type === 'image' && item.sourceKind === 'draft-asset' && item.assetId)
      .map((item) => item.assetId);
  } catch {
    return [];
  }
}

export function scheduleDraftPersist() {
  if (!state.currentBoardId) return;
  clearTimeout(draftPersistTimer);
  draftPersistTimer = setTimeout(() => {
    void persistCurrentDraft();
  }, DRAFT_PERSIST_DELAY);
}

export async function persistCurrentDraft() {
  clearTimeout(draftPersistTimer);
  draftPersistTimer = null;

  const boardId = state.currentBoardId;
  if (!boardId) return;

  if (!state.dirtyBoardIds.has(boardId)) {
    await clearDraft(boardId);
    return;
  }

  const snapshot = await serializeDraft(state.objects);
  const assetIds = collectDraftAssetIds(snapshot);
  await saveDraft(boardId, snapshot, assetIds);
}

export async function flushCurrentDraft() {
  if (!state.currentBoardId) return;
  await persistCurrentDraft();
}

export async function updateTitle() {
  const boards = await getIndex();
  const board = boards.find((item) => item.id === state.currentBoardId);
  document.title = board ? board.name : 'Just a board';
  refreshDirtyBoards();
}

export async function loadCurrentBoard() {
  const boardId = state.currentBoardId;
  if (!boardId) return;

  let draftRecord = await loadDraft(boardId);
  let snapshot = draftRecord?.snapshot ?? await load(boardId) ?? '[]';
  let widgets = [];

  try {
    widgets = await deserialize(snapshot, boardId);
  } catch (error) {
    console.warn('Không thể nạp draft hiện tại, fallback về bản saved:', error);
    draftRecord = null;
    await clearDraft(boardId);
    state.dirtyBoardIds.delete(boardId);
    snapshot = await load(boardId) ?? '[]';
    widgets = await deserialize(snapshot, boardId);
  }

  insertObjects(widgets, 0);

  transientEditDirty = false;
  suppressDirtySync = true;
  if (draftRecord?.snapshot) {
    _deps.commandManager.markUnsaved();
    state.dirtyBoardIds.add(boardId);
  } else {
    _deps.commandManager.markSaved();
    state.dirtyBoardIds.delete(boardId);
  }
  suppressDirtySync = false;

  refreshDirtyBoards();
  _deps.objectList.refresh();
}

export function clearCurrentBoard() {
  _deps.objectEvents.cancelEditing();
  transientEditDirty = false;
  clearSelection();
  clearObjects();
  clearGrid();
  suppressDirtySync = true;
  _deps.commandManager.clear();
  suppressDirtySync = false;
  _deps.contextMenu.hide();
}

export async function switchBoard(boardId) {
  if (state.currentBoardId === boardId) return;

  _deps.objectEvents.commitEditing();
  await flushCurrentDraft();
  clearCurrentBoard();

  state.currentBoardId = boardId;
  await _deps.sidebar.setCurrentBoard(boardId);
  await loadCurrentBoard();
  updateTitle();
}

export async function saveCurrentBoard() {
  if (!state.currentBoardId) return;

  _deps.objectEvents.commitEditing();
  const json = await serializeForSave(state.objects);
  await save(state.currentBoardId, json);
  await clearDraft(state.currentBoardId);

  transientEditDirty = false;
  state.dirtyBoardIds.delete(state.currentBoardId);
  _deps.commandManager.markSaved();
  refreshDirtyBoards();
  updateTitle();
}

export async function handleSave() {
  try {
    await saveCurrentBoard();
  } catch (error) {
    console.error('Lỗi khi lưu:', error);
    notify({
      tone: 'error',
      title: 'Không thể lưu',
      message: 'Máy chủ từ chối lưu. Vui lòng thử lại sau.',
    });
  }
}

export async function initializeData() {
  state.dirtyBoardIds = new Set(await listDirtyBoardIds());
  refreshDirtyBoards();

  const boards = await getIndex();
  if (boards.length === 0) {
    const board = await create('Board mặc định');
    state.currentBoardId = board.id;
  } else {
    state.currentBoardId = boards[0].id;
  }

  await _deps.sidebar.setCurrentBoard(state.currentBoardId);
  await loadCurrentBoard();
  updateTitle();
}

export function getSuppressDirtySync() {
  return suppressDirtySync;
}
