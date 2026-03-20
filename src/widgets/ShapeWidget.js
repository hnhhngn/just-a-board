import { BaseWidget } from './BaseWidget.js';

export class ShapeWidget extends BaseWidget {
  constructor(x, y, width = 200, height = 150) {
    super('shape', x, y, width, height);
  }

  createElement() {
    const el = document.createElement('div');
    el.className = 'board-object shape-widget';
    return el;
  }
}
