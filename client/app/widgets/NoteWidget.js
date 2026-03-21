import { BaseWidget } from './BaseWidget.js';

export class NoteWidget extends BaseWidget {
  constructor(x, y, text = 'Ghi chú mới...') {
    super('note', x, y, 200, 100);
    this.element.innerText = text;
  }

  createElement() {
    const el = document.createElement('div');
    el.className = 'board-object note-widget';
    el.contentEditable = true;
    return el;
  }

  serialize() {
    return {
      ...super.serialize(),
      text: this.element.innerText,
    };
  }
}
