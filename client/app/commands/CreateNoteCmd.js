import { state } from '../state.js';
import { wakeUp } from '../engine.js';
import { addObjectToGrid, removeObjectFromGrid, currentlyVisibleObjects } from '../grid.js';
import { NoteWidget } from '../widgets/NoteWidget.js';

export class CreateNoteCmd {
  constructor(world, x, y) {
    this.world = world;
    this.x = x;
    this.y = y;
    this.widget = null;
  }

  execute() {
    if (!this.widget) {
      this.widget = new NoteWidget(this.x, this.y);
    }

    this.widget.attachTo(this.world);
    state.objects.push(this.widget);
    addObjectToGrid(this.widget);
    currentlyVisibleObjects.add(this.widget);

    wakeUp();
  }

  undo() {
    this.widget.detach();
    const idx = state.objects.indexOf(this.widget);
    if (idx !== -1) state.objects.splice(idx, 1);
    removeObjectFromGrid(this.widget);
    currentlyVisibleObjects.delete(this.widget);
    wakeUp();
  }
}
