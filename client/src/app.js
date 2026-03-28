import { state } from './core/state.js';
import { initEngine } from './core/engine.js';
import { initViewport } from './core/viewport.js';
import { initObjectEvents } from './core/interactionManager.js';
import { initObjectStore, clearObjects } from './core/layerManager.js';
import { CommandManager } from './commands/CommandManager.js';
import { initFloatingToolbar } from './components/layout/FloatingToolbar.js';
import { initSidebar } from './components/layout/Sidebar.js';
import { initBottomBar } from './components/layout/BottomBar.js';
import { initObjectList } from './components/layout/ObjectList.js';
import { initSelectionOverlay } from './components/overlays/SelectionOverlay.js';
import { initContextMenu } from './components/overlays/ContextMenu.js';
import { initConfirmHost } from './components/overlays/dialogs/ConfirmDialog.js';
import { initNotificationsHost } from './components/overlays/ToastManager.js';
import { applyTooltips } from './components/overlays/Tooltip.js';

import { 
  initBoardManager, handleSave, initializeData, switchBoard, 
  getSuppressDirtySync, syncCurrentBoardDirty, scheduleDraftPersist, setTransientEditDirty,
  refreshDirtyBoards, clearCurrentBoard, updateTitle
} from './core/boardManager.js';

import { getIndex, create, remove, rename } from './services/storage/index.js';
import { clearDraft } from './services/storage/DraftStore.js';

import { initKeyboardShortcuts } from './core/keyboardShortcuts.js';

import { clearSelection, getSelectedObjects, setSelection, onSelectionChange } from './core/selection.js';
import { BatchDeleteCmd } from './commands/BatchDeleteCmd.js';
import { BatchMoveCmd } from './commands/BatchMoveCmd.js';
import { InsertObjectsCmd } from './commands/InsertObjectsCmd.js';
import { ReorderObjectsCmd } from './commands/ReorderObjectsCmd.js';
import { readClipboardContent, writeObjectsToClipboard } from './services/clipboard.js';
import { getObjectsBounds } from './utils/geometry.js';
import { moveOrderToFront, moveOrderToBack, moveOrderForward, moveOrderBackward } from './utils/arrayUtils.js';
import { WidgetRegistry } from './components/widgets/WidgetRegistry.js';
import { NoteWidget } from './components/widgets/NoteWidget.js';
import { ShapeWidget } from './components/widgets/ShapeWidget.js';
import { ImageWidget } from './components/widgets/ImageWidget.js';
import { createWidgetFromData } from './services/storage/BoardSerializer.js';

WidgetRegistry.register('note', {
  deserialize: (item, boardId) => new NoteWidget(item.x, item.y, item.text, item.width, item.height),
  create: (x, y) => new NoteWidget(x, y, '')
});

WidgetRegistry.register('shape', {
  deserialize: (item) => new ShapeWidget(item.x, item.y, item.width, item.height),
  create: (x, y) => new ShapeWidget(x, y)
});

WidgetRegistry.register('image', {
  deserialize: (item, boardId) => {
    if (item.sourceKind === 'draft-asset') return ImageWidget.fromDraftAsset(item.x, item.y, boardId, item.assetId, item.width, item.height);
    if (item.sourceKind === 'clipboard-data-url') return ImageWidget.fromClipboardData(item.x, item.y, boardId, item.dataUrl, item.width, item.height);
    return ImageWidget.fromSavedUrl(item.x, item.y, item.src, item.width, item.height);
  }
});

export async function bootstrap() {
  const viewport = document.getElementById('viewport');
  const world = document.getElementById('world');

  let selectionOverlay = null;

  initEngine(world, {
    onRender: () => selectionOverlay?.invalidate(),
  });
  initObjectStore(world);
  applyTooltips(document.body);
  initConfirmHost();
  initNotificationsHost();

  // Đăng ký selection change callback → invalidate overlay
  onSelectionChange(() => selectionOverlay?.invalidate());

  let objectList = null;

  const commandManager = new CommandManager(() => {
    if (getSuppressDirtySync()) return;
    syncCurrentBoardDirty();
    scheduleDraftPersist();
    objectList?.refresh();
  });

  const toolbar = initFloatingToolbar({});
  const bottomBar = initBottomBar({ onSave: handleSave });
  objectList = initObjectList();
  const contextMenu = initContextMenu();
  selectionOverlay = initSelectionOverlay(commandManager);

  // Setup inter-dependencies for actions
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

  function nudgeSelection(dx, dy) {
    const selected = getSelectedObjects();
    if (selected.length === 0) return;
    const beforeEntries = selected.map((obj) => ({ obj, x: obj.x, y: obj.y }));
    const afterEntries = selected.map((obj) => ({ obj, x: obj.x + dx, y: obj.y + dy }));
    commandManager.execute(new BatchMoveCmd(beforeEntries, afterEntries));
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
      objectList?.refresh();
    }
  }

  function getClipboardAnchor(anchorPoint, items) {
    const bounds = getObjectsBounds(items.map((item) => ({
      x: item.x, y: item.y, width: item.width, height: item.height,
    })));
    if (!bounds) return { offsetX: 0, offsetY: 0 };
    return {
      offsetX: anchorPoint.x - bounds.centerX,
      offsetY: anchorPoint.y - bounds.centerY,
    };
  }

  async function pasteClipboardContent(content, anchorPoint, source) {
    if (!state.currentBoardId) return;

    if (content.kind === 'images') {
      const widgets = [];
      for (let i = 0; i < content.blobs.length; i += 1) {
        widgets.push(await ImageWidget.fromBlob(
          anchorPoint.x + i * 24, anchorPoint.y + i * 24,
          state.currentBoardId, content.blobs[i],
        ));
      }
      commandManager.execute(new InsertObjectsCmd(widgets));
      setSelection(widgets, widgets[widgets.length - 1]);
      return;
    }

    if (content.kind === 'objects') {
      const { offsetX, offsetY } = getClipboardAnchor(anchorPoint, content.payload.items);
      const widgets = [];
      for (const item of content.payload.items) {
        widgets.push(await createWidgetFromData({
          ...item, x: item.x + offsetX, y: item.y + offsetY,
        }, state.currentBoardId));
      }
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

  function showContextMenu(request) {
    const selected = getSelectedObjects();
    if (request.kind === 'selection') {
      contextMenu.show({
        kind: 'selection', clientX: request.clientX, clientY: request.clientY,
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
      kind: 'blank', clientX: request.clientX, clientY: request.clientY,
      items: [
        { label: 'Paste', onSelect: () => {
            void (async () => {
              const clipboardContent = await readClipboardContent();
              if (clipboardContent) await pasteClipboardContent(clipboardContent, request.worldPoint, 'context-menu');
            })();
          }
        },
        { label: 'Save', onSelect: () => { void handleSave(); } },
        { label: 'Clear', onSelect: clearBoardContents },
      ],
    });
  }

  const objectEvents = initObjectEvents(viewport, world, commandManager, {
    onToolUsed: () => toolbar.resetTool(),
    onEditingDirtyChange: (isDirty) => {
      setTransientEditDirty(isDirty);
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
    onMarqueeUpdate: () => {
      selectionOverlay?.invalidate();
    },
  });

  initViewport(viewport, { onInteractionChange: () => toolbar.refresh() });

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

  // Inject dependencies into BoardManager
  initBoardManager({
    sidebar, bottomBar, objectList, contextMenu, objectEvents, commandManager
  });

  // Inject dependencies into KeyboardShortcuts
  initKeyboardShortcuts({
    objectEvents, toolbar, commandManager, contextMenu, deleteSelection, copySelection, nudgeSelection, handleSave
  });

  // Finally
  await initializeData();
}
