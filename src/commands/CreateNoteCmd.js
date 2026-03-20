import { state } from '../state.js';
import { wakeUp } from '../engine.js';
import { addObjectToGrid, removeObjectFromGrid, currentlyVisibleObjects } from '../grid.js';

export class CreateNoteCmd {
  constructor(world, x, y) {
    this.world = world;
    this.x = x;
    this.y = y;
    this.obj = null;
  }

  execute() {
    if (!this.obj) {
      // Lần đầu: tạo DOM element
      const note = document.createElement('div');
      note.className = 'note';
      note.contentEditable = true;
      note.innerText = 'Ghi chú mới...';
      note.style.left = `${this.x}px`;
      note.style.top = `${this.y}px`;

      this.obj = {
        type: 'note',
        element: note,
        x: this.x,
        y: this.y,
        width: 200,
        height: 100,
        isVisible: true,
      };
      note.__data = this.obj;
    }

    // Thêm vào bảng
    this.world.appendChild(this.obj.element);
    state.objects.push(this.obj);
    addObjectToGrid(this.obj);
    currentlyVisibleObjects.add(this.obj);

    // Cập nhật kích thước thực tế
    this.obj.width = this.obj.element.offsetWidth || 200;
    this.obj.height = this.obj.element.offsetHeight || 100;

    wakeUp();
  }

  undo() {
    // Lưu lại text hiện tại (phòng user đã sửa)
    this.obj.element.remove();
    const idx = state.objects.indexOf(this.obj);
    if (idx !== -1) state.objects.splice(idx, 1);
    removeObjectFromGrid(this.obj);
    currentlyVisibleObjects.delete(this.obj);
    wakeUp();
  }
}
