import { wakeUp } from '../engine.js';
import { updateObjectInGrid } from '../grid.js';

export class MoveObjectCmd {
  constructor(obj, oldX, oldY, newX, newY) {
    this.obj = obj;
    this.oldX = oldX;
    this.oldY = oldY;
    this.newX = newX;
    this.newY = newY;
  }

  execute() {
    this.obj.x = this.newX;
    this.obj.y = this.newY;
    this.obj.element.style.left = `${this.newX}px`;
    this.obj.element.style.top = `${this.newY}px`;
    updateObjectInGrid(this.obj);
    wakeUp();
  }

  undo() {
    this.obj.x = this.oldX;
    this.obj.y = this.oldY;
    this.obj.element.style.left = `${this.oldX}px`;
    this.obj.element.style.top = `${this.oldY}px`;
    updateObjectInGrid(this.obj);
    wakeUp();
  }
}
