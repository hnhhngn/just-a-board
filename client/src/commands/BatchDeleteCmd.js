import { removeObjects, restoreObjectEntries } from '../core/layerManager.js';

export class BatchDeleteCmd {
  constructor(objects) {
    this.objects = Array.isArray(objects) ? objects.filter(Boolean) : [objects].filter(Boolean);
    this.entries = [];
  }

  execute() {
    this.entries = removeObjects(this.objects);
  }

  undo() {
    restoreObjectEntries(this.entries);
  }
}
