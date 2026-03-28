import { wakeUp } from '../core/engine.js';
import { updateObjectInGrid } from '../core/grid.js';

export class MoveObjectCmd {
  constructor(obj, oldX, oldY, newX, newY) {
    this.obj = obj;
    this.oldX = oldX;
    this.oldY = oldY;
    this.newX = newX;
    this.newY = newY;
  }

  execute() {
    this.obj.setPosition(this.newX, this.newY);
    updateObjectInGrid(this.obj);
    wakeUp();
  }

  undo() {
    this.obj.setPosition(this.oldX, this.oldY);
    updateObjectInGrid(this.obj);
    wakeUp();
  }
}
