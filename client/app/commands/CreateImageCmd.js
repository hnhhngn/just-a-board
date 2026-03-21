import { state } from '../state.js';
import { wakeUp } from '../engine.js';
import { addObjectToGrid, removeObjectFromGrid, updateObjectInGrid, currentlyVisibleObjects } from '../grid.js';
import { ImageWidget } from '../widgets/ImageWidget.js';

export class CreateImageCmd {
  constructor(world, blobUrl, x, y) {
    this.world = world;
    this.blobUrl = blobUrl;
    this.x = x;
    this.y = y;
    this.widget = null;
  }

  execute() {
    if (!this.widget) {
      this.widget = new ImageWidget(this.x, this.y, this.blobUrl);
    }

    this.widget.attachTo(this.world, (w) => updateObjectInGrid(w));
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
