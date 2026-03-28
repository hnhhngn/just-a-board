import { wakeUp } from '../core/engine.js';
import { updateObjectInGrid } from '../core/grid.js';

function applyPositions(entries) {
  entries.forEach(({ obj, x, y }) => {
    obj.setPosition(x, y);
    updateObjectInGrid(obj);
  });
  wakeUp();
}

export class BatchMoveCmd {
  constructor(beforeEntries, afterEntries) {
    this.beforeEntries = beforeEntries;
    this.afterEntries = afterEntries;
  }

  execute() {
    applyPositions(this.afterEntries);
  }

  undo() {
    applyPositions(this.beforeEntries);
  }
}
