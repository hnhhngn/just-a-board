import { setObjectOrder } from '../core/layerManager.js';

export class ReorderObjectsCmd {
  constructor(oldOrder, newOrder) {
    this.oldOrder = [...oldOrder];
    this.newOrder = [...newOrder];
  }

  execute() {
    setObjectOrder(this.newOrder);
  }

  undo() {
    setObjectOrder(this.oldOrder);
  }
}
