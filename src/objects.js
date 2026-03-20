import { state } from './state.js';
import { wakeUp } from './engine.js';
import { addObjectToGrid, updateObjectInGrid, currentlyVisibleObjects } from './grid.js';

/**
 * Khởi tạo sự kiện tạo ghi chú (dblclick) và dán ảnh (paste).
 */
export function initObjectEvents(viewport, world) {
  // Double click để tạo ghi chú
  viewport.addEventListener("dblclick", (e) => {
    if (e.target !== viewport && e.target !== world) return;

    const x = (e.clientX - state.targetX) / state.targetScale;
    const y = (e.clientY - state.targetY) / state.targetScale;

    createNote(world, x, y);
  });

  // Dán hình ảnh từ clipboard
  window.addEventListener("paste", (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
      if (item.type.indexOf("image") !== -1) {
        const blob = item.getAsFile();
        const url = URL.createObjectURL(blob);

        const x = (window.innerWidth / 2 - state.targetX) / state.targetScale;
        const y = (window.innerHeight / 2 - state.targetY) / state.targetScale;

        createImage(world, url, x, y);
      }
    }
  });
}

/**
 * Tạo một ghi chú mới tại vị trí (x, y) trong World.
 */
export function createNote(world, x, y) {
  const note = document.createElement("div");
  note.className = "note";
  note.contentEditable = true;
  note.innerText = "Ghi chú mới...";
  note.style.left = `${x}px`;
  note.style.top = `${y}px`;

  world.appendChild(note);

  const newObj = {
    element: note,
    x: x,
    y: y,
    width: note.offsetWidth || 200,
    height: note.offsetHeight || 100,
    isVisible: true,
  };
  note.__data = newObj;

  state.objects.push(newObj);
  addObjectToGrid(newObj);
  currentlyVisibleObjects.add(newObj);

  wakeUp();
}

/**
 * Tạo một ảnh mới tại vị trí (x, y) trong World.
 */
export function createImage(world, url, x, y) {
  const img = document.createElement("img");
  img.src = url;
  img.className = "note image-note";
  img.style.left = `${x}px`;
  img.style.top = `${y}px`;

  // Chặn sự kiện kéo ảnh mặc định của trình duyệt
  img.addEventListener("dragstart", (e) => e.preventDefault());

  world.appendChild(img);

  const newObj = {
    element: img,
    x: x,
    y: y,
    width: 300,
    height: 300,
    isVisible: true,
  };
  img.__data = newObj;

  img.onload = () => {
    newObj.width = img.offsetWidth;
    newObj.height = img.offsetHeight;
    updateObjectInGrid(newObj);
  };

  state.objects.push(newObj);
  addObjectToGrid(newObj);
  currentlyVisibleObjects.add(newObj);

  wakeUp();
}
