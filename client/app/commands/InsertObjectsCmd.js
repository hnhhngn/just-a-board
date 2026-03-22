import { state } from '../state.js';
import { insertObjects, removeObjects } from '../objectStore.js';

export class InsertObjectsCmd {
  constructor(objects, index = null) {
    this.objects = Array.isArray(objects) ? objects : [objects];
    this.index = index;
  }

  execute() {
    if (this.index === null) {
      this.index = state.objects.length;
    }
    insertObjects(this.objects, this.index === null ? undefined : this.index);
  }

  undo() {
    removeObjects(this.objects);
  }
}
