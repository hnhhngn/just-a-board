import { state } from '../state.js';
import { addObjectToGrid, currentlyVisibleObjects } from '../grid.js';
import { wakeUp } from '../engine.js';

/**
 * Chuyển blob URL thành data URL (base64) để lưu trữ.
 */
async function toDataUrl(src) {
  if (src.startsWith('data:')) return src;
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/**
 * Serialize mảng objects[] thành JSON string (async vì cần chuyển ảnh sang base64).
 */
export async function serialize(objects) {
  const data = [];
  for (const obj of objects) {
    if (obj.type === 'image') {
      const dataUrl = await toDataUrl(obj.element.src);
      data.push({
        type: 'image',
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        src: dataUrl,
      });
    } else {
      data.push({
        type: 'note',
        x: obj.x,
        y: obj.y,
        text: obj.element.innerText,
      });
    }
  }
  return JSON.stringify(data);
}

/**
 * Deserialize JSON string thành các object DOM trên bảng.
 * Không đi qua CommandManager — load không phải hành động undoable.
 */
export function deserialize(jsonString, world) {
  const data = JSON.parse(jsonString);

  data.forEach((item) => {
    let element;

    if (item.type === 'image') {
      element = document.createElement('img');
      element.src = item.src;
      element.className = 'note image-note';
      element.addEventListener('dragstart', (e) => e.preventDefault());
    } else {
      element = document.createElement('div');
      element.className = 'note';
      element.contentEditable = true;
      element.innerText = item.text || '';
    }

    element.style.left = `${item.x}px`;
    element.style.top = `${item.y}px`;
    world.appendChild(element);

    const obj = {
      type: item.type,
      element: element,
      x: item.x,
      y: item.y,
      width: item.width || element.offsetWidth || 200,
      height: item.height || element.offsetHeight || 100,
      isVisible: true,
    };
    element.__data = obj;

    state.objects.push(obj);
    addObjectToGrid(obj);
    currentlyVisibleObjects.add(obj);
  });

  wakeUp();
}
