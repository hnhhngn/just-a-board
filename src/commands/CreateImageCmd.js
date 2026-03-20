import { state } from '../state.js';
import { wakeUp } from '../engine.js';
import { addObjectToGrid, removeObjectFromGrid, updateObjectInGrid, currentlyVisibleObjects } from '../grid.js';

export class CreateImageCmd {
  constructor(world, blobUrl, x, y) {
    this.world = world;
    this.blobUrl = blobUrl;
    this.x = x;
    this.y = y;
    this.obj = null;
  }

  execute() {
    if (!this.obj) {
      // Lần đầu: tạo DOM element
      const img = document.createElement('img');
      img.src = this.blobUrl;
      img.className = 'note image-note';
      img.style.left = `${this.x}px`;
      img.style.top = `${this.y}px`;
      img.addEventListener('dragstart', (e) => e.preventDefault());

      this.obj = {
        type: 'image',
        element: img,
        x: this.x,
        y: this.y,
        width: 300,
        height: 300,
        isVisible: true,
      };
      img.__data = this.obj;

      img.onload = () => {
        this.obj.width = img.offsetWidth || 300;
        this.obj.height = img.offsetHeight || 300;
        updateObjectInGrid(this.obj);
      };
    }

    // Thêm vào bảng
    this.world.appendChild(this.obj.element);
    state.objects.push(this.obj);
    addObjectToGrid(this.obj);
    currentlyVisibleObjects.add(this.obj);

    wakeUp();
  }

  undo() {
    this.obj.element.remove();
    const idx = state.objects.indexOf(this.obj);
    if (idx !== -1) state.objects.splice(idx, 1);
    removeObjectFromGrid(this.obj);
    currentlyVisibleObjects.delete(this.obj);
    wakeUp();
  }
}
