import { BaseWidget } from './BaseWidget.js';

export class NoteWidget extends BaseWidget {
  constructor(x, y, text = 'Ghi chú mới...', width = 200, height = 100) {
    super('note', x, y, width, height);
    this.setText(text);
    this.disableEditing();
  }

  createElement() {
    const el = document.createElement('div');
    el.className = 'board-object note-widget';
    el.spellcheck = false;
    el.setAttribute('role', 'textbox');
    el.setAttribute('aria-multiline', 'true');
    return el;
  }

  getText() {
    return this.element.innerText;
  }

  setText(text) {
    this.element.innerText = text;
  }

  enableEditing() {
    this.element.contentEditable = 'true';
    this.element.classList.add('is-editing');
  }

  disableEditing() {
    this.element.contentEditable = 'false';
    this.element.classList.remove('is-editing');
  }

  focusAtEnd() {
    this.element.focus();
    const selection = window.getSelection();
    if (!selection) return;
    const range = document.createRange();
    range.selectNodeContents(this.element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  async serializeDraft() {
    return {
      ...this.serializeBase(),
      text: this.getText(),
    };
  }

  async serializeForSave() {
    return {
      ...this.serializeBase(),
      text: this.getText(),
    };
  }

  async serializeForClipboard() {
    return {
      ...this.serializeBase(),
      text: this.getText(),
    };
  }
}
