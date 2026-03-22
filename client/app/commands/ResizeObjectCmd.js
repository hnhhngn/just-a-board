import { wakeUp } from '../engine.js';
import { updateObjectInGrid } from '../grid.js';

function applyRect(obj, rect) {
  obj.setPosition(rect.x, rect.y);
  obj.setSize(rect.width, rect.height);
  obj.updateSize();
  updateObjectInGrid(obj);
  wakeUp();
}

export class ResizeObjectCmd {
  constructor(obj, beforeRect, afterRect) {
    this.obj = obj;
    this.beforeRect = beforeRect;
    this.afterRect = afterRect;
  }

  execute() {
    applyRect(this.obj, this.afterRect);
  }

  undo() {
    applyRect(this.obj, this.beforeRect);
  }
}
