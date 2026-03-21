import { state } from '../state.js';
import { addObjectToGrid, currentlyVisibleObjects } from '../grid.js';
import { wakeUp } from '../engine.js';
import { NoteWidget } from '../widgets/NoteWidget.js';
import { ImageWidget } from '../widgets/ImageWidget.js';
import { ShapeWidget } from '../widgets/ShapeWidget.js';

/**
 * Serialize mảng objects[] thành JSON string.
 * Async vì ImageWidget cần chuyển blob → base64.
 */
export async function serialize(objects) {
  // TODO: Tách base64 image sang endpoint riêng (/api/images) để tránh file JSON của board quá lớn
  const data = [];
  for (const obj of objects) {
    data.push(await obj.serialize());
  }
  return JSON.stringify(data);
}

/**
 * Deserialize JSON string thành các Widget trên bảng.
 * Không đi qua CommandManager — load không phải hành động undoable.
 */
export function deserialize(jsonString, world) {
  const data = JSON.parse(jsonString);

  data.forEach((item) => {
    let widget;

    if (item.type === 'image') {
      widget = new ImageWidget(item.x, item.y, item.src);
    } else if (item.type === 'shape') {
      widget = new ShapeWidget(item.x, item.y, item.width, item.height);
    } else {
      widget = new NoteWidget(item.x, item.y, item.text);
    }

    widget.attachTo(world);
    state.objects.push(widget);
    addObjectToGrid(widget);
    currentlyVisibleObjects.add(widget);
  });

  wakeUp();
}
