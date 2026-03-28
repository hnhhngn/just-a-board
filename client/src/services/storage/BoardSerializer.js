import { state } from '../../core/state.js';
import { WidgetRegistry } from '../../components/widgets/WidgetRegistry.js';

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
  return await WidgetRegistry.deserialize(item.type || 'note', item, boardId);
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
