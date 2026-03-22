import { getEffectiveTool, state } from './state.js';
import { wakeUp } from './engine.js';
import { InsertObjectsCmd } from './commands/InsertObjectsCmd.js';
import { BatchMoveCmd } from './commands/BatchMoveCmd.js';
import { EditNoteTextCmd } from './commands/EditNoteTextCmd.js';
import { readClipboardContentFromEvent } from './clipboard.js';
import { getViewportCenterWorld, screenToWorld, zoomToObject } from './objectActions.js';
import { clearSelection, getPrimarySelection, getSelectedObjects, isSelected, selectOnly, setHoveredObject, setSelection, toggleSelection } from './selection.js';
import { updateObjectInGrid } from './grid.js';
import { NoteWidget } from './widgets/NoteWidget.js';
import { ShapeWidget } from './widgets/ShapeWidget.js';

let _commandManager = null;
let _callbacks = null;
let _lastMouseDown = null;
let _dragSession = null;
let _editSession = null;
let _marqueeSession = null;

function getNormalizedClientRect(x1, y1, x2, y2) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const right = Math.max(x1, x2);
  const bottom = Math.max(y1, y2);

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
    right,
    bottom,
  };
}

function intersectsClientRect(a, b) {
  return !(
    a.right < b.left ||
    a.left > b.right ||
    a.bottom < b.top ||
    a.top > b.bottom
  );
}

function notifyEditDirty(isDirty) {
  if (_callbacks?.onEditingDirtyChange) _callbacks.onEditingDirtyChange(isDirty);
}

function endEditingSession({ cancel = false } = {}) {
  if (!_editSession) return false;

  const session = _editSession;
  _editSession = null;
  state.editingObject = null;
  session.note.disableEditing();

  const nextText = session.note.getText();
  const changed = nextText !== session.initialText;

  if (cancel && changed) {
    session.note.setText(session.initialText);
  } else if (!cancel && changed) {
    _commandManager.record(new EditNoteTextCmd(session.note, session.initialText, nextText));
  }

  notifyEditDirty(false);
  return changed && !cancel;
}

function startEditingNote(note) {
  if (!note || note.type !== 'note') return false;

  if (_editSession?.note === note) return true;
  endEditingSession();

  selectOnly(note);
  state.editingObject = note;
  _editSession = {
    note,
    initialText: note.getText(),
  };

  note.enableEditing();
  note.focusAtEnd();
  notifyEditDirty(false);
  return true;
}

function beginDrag(obj, event) {
  const selected = getSelectedObjects();
  _dragSession = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    beforeEntries: selected.map((item) => ({
      obj: item,
      x: item.x,
      y: item.y,
    })),
    moved: false,
  };
}

function beginMarquee(event) {
  _marqueeSession = {
    startClientX: event.clientX,
    startClientY: event.clientY,
    ctrlKey: event.ctrlKey,
    beforeSelection: getSelectedObjects(),
    moved: false,
  };
  state.marqueeRect = {
    left: event.clientX,
    top: event.clientY,
    width: 0,
    height: 0,
  };
}

function handleToolCreate(event) {
  const clickTool = _lastMouseDown?.tool ?? getEffectiveTool();
  if (clickTool === 'select' || clickTool === 'pan') return;
  if (event.target !== event.currentTarget && event.target.id !== 'world') return;

  if (_lastMouseDown) {
    const dx = Math.abs(event.clientX - _lastMouseDown.x);
    const dy = Math.abs(event.clientY - _lastMouseDown.y);
    if (dx > 5 || dy > 5) return;
  }

  const point = screenToWorld(event.clientX, event.clientY);
  const widget = clickTool === 'shape'
    ? new ShapeWidget(point.x, point.y)
    : new NoteWidget(point.x, point.y);

  _commandManager.execute(new InsertObjectsCmd(widget));
  selectOnly(widget);

  if (_callbacks?.onToolUsed) _callbacks.onToolUsed();
}

export function initObjectEvents(viewport, world, commandManager, callbacks = {}) {
  _commandManager = commandManager;
  _callbacks = callbacks;

  viewport.addEventListener('mousedown', (event) => {
    _lastMouseDown = { x: event.clientX, y: event.clientY, tool: getEffectiveTool() };

    if (event.button !== 0) return;

    const isPanGesture = event.shiftKey || state.isSpacePressed || state.isPanning;
    const activeTool = getEffectiveTool();

    const objectEl = event.target.closest('.board-object');
    const obj = objectEl?.__data || null;

    if (activeTool !== 'select') {
      return;
    }

    if (state.editingObject && (!obj || obj !== state.editingObject)) {
      endEditingSession();
    }

    if (!obj) {
      if (!event.shiftKey && !state.isSpacePressed) {
        event.preventDefault();
        beginMarquee(event);
      }
      return;
    }

    if (isPanGesture) {
      return;
    }

    if (state.editingObject === obj) {
      return;
    }

    event.stopPropagation();

    if (event.ctrlKey) {
      event.preventDefault();
      toggleSelection(obj);
      return;
    }

    if (!isSelected(obj)) {
      selectOnly(obj);
    }

    event.preventDefault();
    beginDrag(obj, event);
  });

  viewport.addEventListener('mousemove', (event) => {
    if (getEffectiveTool() !== 'select' || state.editingObject || state.isPanning) {
      setHoveredObject(null);
      return;
    }

    const objectEl = event.target.closest('.board-object');
    setHoveredObject(objectEl?.__data || null);
  });

  viewport.addEventListener('mouseleave', () => {
    setHoveredObject(null);
  });

  window.addEventListener('mousemove', (event) => {
    if (!_dragSession) return;

    const dx = (event.clientX - _dragSession.startClientX) / state.currentScale;
    const dy = (event.clientY - _dragSession.startClientY) / state.currentScale;
    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
      _dragSession.moved = true;
      state.isDraggingSelection = true;
    }

    _dragSession.beforeEntries.forEach((entry) => {
      entry.obj.setPosition(entry.x + dx, entry.y + dy);
      updateObjectInGrid(entry.obj);
    });
    wakeUp();
  });

  window.addEventListener('mousemove', (event) => {
    if (!_marqueeSession) return;

    const rect = getNormalizedClientRect(
      _marqueeSession.startClientX,
      _marqueeSession.startClientY,
      event.clientX,
      event.clientY,
    );

    _marqueeSession.moved = rect.width > 4 || rect.height > 4;
    state.marqueeRect = {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  });

  window.addEventListener('mouseup', () => {
    if (!_dragSession) return;

    const afterEntries = _dragSession.beforeEntries.map((entry) => ({
      obj: entry.obj,
      x: entry.obj.x,
      y: entry.obj.y,
    }));

    const changed = afterEntries.some((entry, index) => (
      entry.x !== _dragSession.beforeEntries[index].x ||
      entry.y !== _dragSession.beforeEntries[index].y
    ));

    if (changed) {
      _commandManager.record(new BatchMoveCmd(_dragSession.beforeEntries, afterEntries));
    }

    _dragSession = null;
    state.isDraggingSelection = false;
  });

  window.addEventListener('mouseup', () => {
    if (!_marqueeSession) return;

    if (_marqueeSession.moved) {
      const marqueeBounds = {
        ...state.marqueeRect,
        right: state.marqueeRect.left + state.marqueeRect.width,
        bottom: state.marqueeRect.top + state.marqueeRect.height,
      };

      const hits = state.objects.filter((obj) => intersectsClientRect(marqueeBounds, obj.element.getBoundingClientRect()));
      const nextSelection = _marqueeSession.ctrlKey
        ? [...new Set([..._marqueeSession.beforeSelection, ...hits])]
        : hits;

      setSelection(nextSelection, nextSelection[nextSelection.length - 1] || null);
    } else if (!_marqueeSession.ctrlKey) {
      clearSelection();
    }

    _marqueeSession = null;
    state.marqueeRect = null;
  });

  viewport.addEventListener('click', handleToolCreate);

  viewport.addEventListener('dblclick', (event) => {
    const objectEl = event.target.closest('.board-object');
    const obj = objectEl?.__data || null;
    if (!obj) return;
    event.preventDefault();
    zoomToObject(obj);
  });

  viewport.addEventListener('contextmenu', (event) => {
    const objectEl = event.target.closest('.board-object');
    const obj = objectEl?.__data || null;

    if (state.editingObject && obj === state.editingObject) {
      return;
    }

    event.preventDefault();
    const worldPoint = screenToWorld(event.clientX, event.clientY);
    state.lastContextWorldPoint = worldPoint;

    if (obj) {
      if (!isSelected(obj)) {
        selectOnly(obj);
      }

      if (_callbacks?.onRequestContextMenu) {
        _callbacks.onRequestContextMenu({
          kind: 'selection',
          clientX: event.clientX,
          clientY: event.clientY,
          worldPoint,
          objects: getSelectedObjects(),
        });
      }
      return;
    }

    if (_callbacks?.onRequestContextMenu) {
      _callbacks.onRequestContextMenu({
        kind: 'blank',
        clientX: event.clientX,
        clientY: event.clientY,
        worldPoint,
      });
    }
  });

  viewport.addEventListener('input', (event) => {
    const objectEl = event.target.closest('.board-object');
    const obj = objectEl?.__data || null;
    if (!obj || obj !== state.editingObject) return;
    notifyEditDirty(obj.getText() !== _editSession?.initialText);
    if (_callbacks?.onEditingInput) _callbacks.onEditingInput();
  });

  viewport.addEventListener('keydown', (event) => {
    if (event.target !== state.editingObject?.element) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      endEditingSession({ cancel: true });
    }
  });

  viewport.addEventListener('focusout', (event) => {
    if (!state.editingObject) return;
    if (event.target === state.editingObject.element) {
      endEditingSession();
    }
  });

  window.addEventListener('paste', async (event) => {
    if (state.editingObject) return;
    const content = readClipboardContentFromEvent(event);
    if (!content) return;
    event.preventDefault();

    if (_callbacks?.onPasteContent) {
      await _callbacks.onPasteContent(content, getViewportCenterWorld(), 'keyboard');
    }
  });

  return {
    commitEditing() {
      endEditingSession();
    },
    cancelEditing() {
      endEditingSession({ cancel: true });
    },
    startEditingPrimarySelection() {
      return startEditingNote(getPrimarySelection());
    },
    isEditing() {
      return Boolean(state.editingObject);
    },
  };
}
