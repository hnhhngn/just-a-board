import { state, settings } from './state.js';
import { getPrimarySelection } from './selection.js';
import { persistCurrentDraft } from './boardManager.js';

export function initKeyboardShortcuts(deps) {
  const { 
    objectEvents, 
    toolbar, 
    commandManager, 
    contextMenu, 
    deleteSelection, 
    copySelection, 
    nudgeSelection, 
    handleSave 
  } = deps;

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
}
