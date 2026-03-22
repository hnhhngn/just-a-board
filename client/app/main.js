import { state, settings } from './state.js';
import { initEngine } from './engine.js';
import { initViewport } from './viewport.js';
import { initObjectEvents } from './objects.js';
import { clearGrid } from './grid.js';
import { initObjectStore, clearObjects, insertObjects } from './objectStore.js';
import { CommandManager } from './commands/CommandManager.js';
import { deserialize, createWidgetFromData, serializeDraft, serializeForSave } from './storage/BoardSerializer.js';
import { clearDraft, listDirtyBoardIds, loadDraft, saveDraft } from './storage/DraftStore.js';
import { getIndex, create, remove, save, load, rename } from './storage/index.js';
import { initFloatingToolbar } from './hud/FloatingToolbar.js';
import { initSidebar } from './hud/Sidebar.js';
import { initBottomBar } from './hud/BottomBar.js';
import { initObjectList } from './hud/ObjectList.js';
import { initSelectionOverlay } from './hud/SelectionOverlay.js';
import { initContextMenu } from './hud/ContextMenu.js';
import { BatchDeleteCmd } from './commands/BatchDeleteCmd.js';
import { BatchMoveCmd } from './commands/BatchMoveCmd.js';
import { InsertObjectsCmd } from './commands/InsertObjectsCmd.js';
import { ReorderObjectsCmd } from './commands/ReorderObjectsCmd.js';
import { readClipboardContent, writeObjectsToClipboard } from './clipboard.js';
import { getObjectsBounds, moveOrderBackward, moveOrderForward, moveOrderToBack, moveOrderToFront } from './objectActions.js';
import { clearSelection, getPrimarySelection, getSelectedObjects, setSelection } from './selection.js';
import { ImageWidget } from './widgets/ImageWidget.js';
import { initFeedbackHost, notify } from './feedback/index.js';
import { applyTooltips } from './ui/index.js';

const DRAFT_PERSIST_DELAY = 250;

const viewport = document.getElementById('viewport');
const world = document.getElementById('world');

initEngine(world);
initObjectStore(world);
applyTooltips(document.body);
initFeedbackHost();

let draftPersistTimer = null;
let transientEditDirty = false;
let suppressDirtySync = false;

const commandManager = new CommandManager(() => {
  if (suppressDirtySync) return;
  syncCurrentBoardDirty();
  scheduleDraftPersist();
  objectList?.refresh();
});

const toolbar = initFloatingToolbar({});
const bottomBar = initBottomBar({ onSave: handleSave });
const objectList = initObjectList();
const contextMenu = initContextMenu();
initSelectionOverlay(commandManager);

const objectEvents = initObjectEvents(viewport, world, commandManager, {
  onToolUsed: () => toolbar.resetTool(),
  onEditingDirtyChange: (isDirty) => {
    transientEditDirty = isDirty;
    syncCurrentBoardDirty();
    scheduleDraftPersist();
  },
  onEditingInput: () => {
    scheduleDraftPersist();
    objectList.refresh();
  },
  onRequestContextMenu: (request) => {
    showContextMenu(request);
  },
  onPasteContent: async (content, anchorPoint, source) => {
    await pasteClipboardContent(content, anchorPoint, source);
  },
});

initViewport(viewport, {
  onInteractionChange: () => toolbar.refresh(),
});

const sidebar = initSidebar({
  getIndex,
  currentBoardId: state.currentBoardId,
  menuIcon: toolbar.menuIcon,
  onBoardSelect: async (id) => switchBoard(id),
  onBoardCreate: async () => {
    const board = await create();
    await switchBoard(board.id);
  },
  onBoardDelete: async (id) => {
    await remove(id);
    await clearDraft(id);
    state.dirtyBoardIds.delete(id);
    refreshDirtyBoards();

    if (id === state.currentBoardId) {
      state.currentBoardId = null;
      const boards = await getIndex();
      if (boards.length > 0) {
        await switchBoard(boards[0].id);
      } else {
        clearCurrentBoard();
        document.title = 'Just a board';
      }
    }
  },
  onBoardRename: async (id, newName) => {
    await rename(id, newName);
    updateTitle();
  },
});

await initializeData();

async function initializeData() {
  state.dirtyBoardIds = new Set(await listDirtyBoardIds());
  refreshDirtyBoards();

  const boards = await getIndex();
  if (boards.length === 0) {
    const board = await create('Board mặc định');
    state.currentBoardId = board.id;
  } else {
    state.currentBoardId = boards[0].id;
  }

  await sidebar.setCurrentBoard(state.currentBoardId);
  await loadCurrentBoard();
  updateTitle();
}

function refreshDirtyBoards() {
  state.hasUnsavedChanges = state.currentBoardId
    ? state.dirtyBoardIds.has(state.currentBoardId)
    : false;

  if (sidebar?.setDirtyBoards) sidebar.setDirtyBoards([...state.dirtyBoardIds]);
  if (sidebar?.setDirtyIndicator) sidebar.setDirtyIndicator(state.hasUnsavedChanges);
  if (bottomBar?.setDirtyIndicator) bottomBar.setDirtyIndicator(state.hasUnsavedChanges);
}

function syncCurrentBoardDirty() {
  if (!state.currentBoardId) return;

  const isDirty = commandManager.isDirty() || transientEditDirty;
  if (isDirty) {
    state.dirtyBoardIds.add(state.currentBoardId);
  } else {
    state.dirtyBoardIds.delete(state.currentBoardId);
  }

  refreshDirtyBoards();
  updateTitle();
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

function scheduleDraftPersist() {
  if (!state.currentBoardId) return;
  clearTimeout(draftPersistTimer);
  draftPersistTimer = setTimeout(() => {
    void persistCurrentDraft();
  }, DRAFT_PERSIST_DELAY);
}

async function persistCurrentDraft() {
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

async function flushCurrentDraft() {
  if (!state.currentBoardId) return;
  await persistCurrentDraft();
}

async function updateTitle() {
  const boards = await getIndex();
  const board = boards.find((item) => item.id === state.currentBoardId);
  document.title = board ? board.name : 'Just a board';
  refreshDirtyBoards();
}

async function loadCurrentBoard() {
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
    commandManager.markUnsaved();
    state.dirtyBoardIds.add(boardId);
  } else {
    commandManager.markSaved();
    state.dirtyBoardIds.delete(boardId);
  }
  suppressDirtySync = false;

  refreshDirtyBoards();
  objectList.refresh();
}

function clearCurrentBoard() {
  objectEvents.cancelEditing();
  transientEditDirty = false;
  clearSelection();
  clearObjects();
  clearGrid();
  suppressDirtySync = true;
  commandManager.clear();
  suppressDirtySync = false;
  contextMenu.hide();
}

async function switchBoard(boardId) {
  if (state.currentBoardId === boardId) return;

  objectEvents.commitEditing();
  await flushCurrentDraft();
  clearCurrentBoard();

  state.currentBoardId = boardId;
  await sidebar.setCurrentBoard(boardId);
  await loadCurrentBoard();
  updateTitle();
}

async function saveCurrentBoard() {
  if (!state.currentBoardId) return;

  objectEvents.commitEditing();
  const json = await serializeForSave(state.objects);
  await save(state.currentBoardId, json);
  await clearDraft(state.currentBoardId);

  transientEditDirty = false;
  state.dirtyBoardIds.delete(state.currentBoardId);
  commandManager.markSaved();
  refreshDirtyBoards();
  updateTitle();
}

function getClipboardAnchor(anchorPoint, items) {
  const bounds = getObjectsBounds(items.map((item) => ({
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  })));

  if (!bounds) return { offsetX: 0, offsetY: 0 };

  return {
    offsetX: anchorPoint.x - bounds.centerX,
    offsetY: anchorPoint.y - bounds.centerY,
  };
}

async function buildWidgetsFromClipboardItems(items, anchorPoint) {
  const { offsetX, offsetY } = getClipboardAnchor(anchorPoint, items);
  const widgets = [];

  for (const item of items) {
    widgets.push(await createWidgetFromData({
      ...item,
      x: item.x + offsetX,
      y: item.y + offsetY,
    }, state.currentBoardId));
  }

  return widgets;
}

async function pasteClipboardContent(content, anchorPoint, source) {
  if (!state.currentBoardId) return;

  if (content.kind === 'images') {
    const widgets = [];
    for (let i = 0; i < content.blobs.length; i += 1) {
      widgets.push(await ImageWidget.fromBlob(
        anchorPoint.x + i * 24,
        anchorPoint.y + i * 24,
        state.currentBoardId,
        content.blobs[i],
      ));
    }

    commandManager.execute(new InsertObjectsCmd(widgets));
    setSelection(widgets, widgets[widgets.length - 1]);
    return;
  }

  if (content.kind === 'objects') {
    const widgets = await buildWidgetsFromClipboardItems(content.payload.items, anchorPoint);
    commandManager.execute(new InsertObjectsCmd(widgets));
    setSelection(widgets, widgets[widgets.length - 1]);
    return;
  }

  if (source === 'context-menu') {
    const clipboardContent = await readClipboardContent();
    if (clipboardContent) {
      await pasteClipboardContent(clipboardContent, anchorPoint, 'clipboard-api');
    }
  }
}

function deleteSelection() {
  const selected = getSelectedObjects();
  if (selected.length === 0) return;
  clearSelection();
  commandManager.execute(new BatchDeleteCmd(selected));
}

function clearBoardContents() {
  if (state.objects.length === 0) return;
  clearSelection();
  commandManager.execute(new BatchDeleteCmd([...state.objects]));
}

async function copySelection() {
  const selected = getSelectedObjects();
  if (selected.length === 0) return;
  await writeObjectsToClipboard(selected);
}

function reorderSelection(direction) {
  const selected = getSelectedObjects();
  if (selected.length === 0) return;

  const selectedSet = new Set(selected);
  const oldOrder = [...state.objects];
  let newOrder = oldOrder;

  if (direction === 'front') newOrder = moveOrderToFront(oldOrder, selectedSet);
  if (direction === 'back') newOrder = moveOrderToBack(oldOrder, selectedSet);
  if (direction === 'forward') newOrder = moveOrderForward(oldOrder, selectedSet);
  if (direction === 'backward') newOrder = moveOrderBackward(oldOrder, selectedSet);

  const unchanged = oldOrder.every((obj, index) => obj === newOrder[index]);
  if (!unchanged) {
    commandManager.execute(new ReorderObjectsCmd(oldOrder, newOrder));
    objectList.refresh();
  }
}

function nudgeSelection(dx, dy) {
  const selected = getSelectedObjects();
  if (selected.length === 0) return;

  const beforeEntries = selected.map((obj) => ({ obj, x: obj.x, y: obj.y }));
  const afterEntries = selected.map((obj) => ({ obj, x: obj.x + dx, y: obj.y + dy }));
  commandManager.execute(new BatchMoveCmd(beforeEntries, afterEntries));
}

function showContextMenu(request) {
  const selected = getSelectedObjects();

  if (request.kind === 'selection') {
    contextMenu.show({
      kind: 'selection',
      clientX: request.clientX,
      clientY: request.clientY,
      items: [
        { label: 'Delete', onSelect: deleteSelection, disabled: selected.length === 0 },
        { label: 'Copy', onSelect: () => { void copySelection(); }, disabled: selected.length === 0 },
        { label: 'Bring to front', onSelect: () => reorderSelection('front'), disabled: selected.length === 0 },
        { label: 'Send to back', onSelect: () => reorderSelection('back'), disabled: selected.length === 0 },
        { label: 'Bring forward', onSelect: () => reorderSelection('forward'), disabled: selected.length === 0 },
        { label: 'Send backward', onSelect: () => reorderSelection('backward'), disabled: selected.length === 0 },
      ],
    });
    return;
  }

  contextMenu.show({
    kind: 'blank',
    clientX: request.clientX,
    clientY: request.clientY,
    items: [
      {
        label: 'Paste',
        onSelect: () => {
          void (async () => {
            const clipboardContent = await readClipboardContent();
            if (clipboardContent) {
              await pasteClipboardContent(clipboardContent, request.worldPoint, 'context-menu');
            }
          })();
        },
      },
      { label: 'Save', onSelect: () => { void handleSave(); } },
      { label: 'Clear', onSelect: clearBoardContents },
    ],
  });
}

window.addEventListener('keydown', (event) => {
  const isEditing = objectEvents.isEditing();

  if (event.code === 'Space' && !isEditing) {
    state.isSpacePressed = true;
    toolbar.refresh();
    event.preventDefault();
  }

  if (event.ctrlKey && event.key === 'z' && !event.shiftKey && !isEditing) {
    event.preventDefault();
    commandManager.undo();
    return;
  }

  if ((event.ctrlKey && event.key === 'y' && !isEditing) || (event.ctrlKey && event.shiftKey && event.key === 'Z' && !isEditing)) {
    event.preventDefault();
    commandManager.redo();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 's') {
    event.preventDefault();
    void handleSave();
    return;
  }

  if (event.ctrlKey && event.key.toLowerCase() === 'c' && !isEditing) {
    event.preventDefault();
    void copySelection();
    return;
  }

  if (!isEditing && (event.key === 'Delete' || event.key === 'Backspace')) {
    event.preventDefault();
    deleteSelection();
    return;
  }

  if (!isEditing && (event.key === 'Enter' || event.key === 'F2')) {
    const primary = getPrimarySelection();
    if (primary?.type === 'note') {
      event.preventDefault();
      objectEvents.startEditingPrimarySelection();
      return;
    }
  }

  if (!isEditing && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    const step = event.shiftKey ? settings.keyboardFastNudgeStep : settings.keyboardNudgeStep;
    if (event.key === 'ArrowUp') nudgeSelection(0, -step);
    if (event.key === 'ArrowDown') nudgeSelection(0, step);
    if (event.key === 'ArrowLeft') nudgeSelection(-step, 0);
    if (event.key === 'ArrowRight') nudgeSelection(step, 0);
    return;
  }

  if (!isEditing && !event.ctrlKey && !event.altKey && !event.shiftKey) {
    if (event.key.toLowerCase() === 'v') toolbar.resetTool();
    if (event.key.toLowerCase() === 'n') toolbar.setTool('note');
    if (event.key.toLowerCase() === 's') toolbar.setTool('shape');
  }

  if (event.key === 'Escape') {
    contextMenu.hide();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') {
    state.isSpacePressed = false;
    toolbar.refresh();
  }
});

window.addEventListener('pagehide', () => {
  objectEvents.commitEditing();
  void persistCurrentDraft();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    objectEvents.commitEditing();
    void persistCurrentDraft();
  }
});

async function handleSave() {
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
