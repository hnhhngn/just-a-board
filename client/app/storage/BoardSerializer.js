import { state } from '../state.js';
import { NoteWidget } from '../widgets/NoteWidget.js';
import { ImageWidget } from '../widgets/ImageWidget.js';
import { ShapeWidget } from '../widgets/ShapeWidget.js';

function parseItems(jsonString) {
  if (!jsonString) return [];

  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function createWidgetFromData(item, boardId = state.currentBoardId) {
  if (item.type === 'image') {
    if (item.sourceKind === 'draft-asset') {
      return ImageWidget.fromDraftAsset(item.x, item.y, boardId, item.assetId, item.width, item.height);
    }

    if (item.sourceKind === 'clipboard-data-url') {
      return ImageWidget.fromClipboardData(item.x, item.y, boardId, item.dataUrl, item.width, item.height);
    }

    return ImageWidget.fromSavedUrl(item.x, item.y, item.src, item.width, item.height);
  }

  if (item.type === 'shape') {
    return new ShapeWidget(item.x, item.y, item.width, item.height);
  }

  return new NoteWidget(item.x, item.y, item.text, item.width, item.height);
}

export async function deserialize(jsonString, boardId = state.currentBoardId) {
  const items = parseItems(jsonString);
  const widgets = [];

  for (const item of items) {
    widgets.push(await createWidgetFromData(item, boardId));
  }

  return widgets;
}

export async function serializeDraft(objects) {
  const data = [];
  for (const obj of objects) {
    data.push(await obj.serializeDraft());
  }
  return JSON.stringify(data);
}

export async function serializeForSave(objects) {
  const data = [];
  for (const obj of objects) {
    data.push(await obj.serializeForSave());
  }
  return JSON.stringify(data);
}

export async function serializeForClipboard(objects) {
  const data = [];
  for (const obj of objects) {
    data.push(await obj.serializeForClipboard());
  }
  return data;
}
