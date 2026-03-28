import { BaseWidget } from './BaseWidget.js';

export class NoteWidget extends BaseWidget {
  constructor(x, y, text = 'Ghi chú mới...', width = 200, height = 100) {
    super('note', x, y, width, height);
    /** @private Data field — source of truth cho text content */
    this._text = text;
    this.element.innerText = text;
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

  /**
   * Đọc text từ DATA (pure, không cần DOM).
   * Worker-safe, serialize-safe.
   */
  getText() {
    return this._text;
  }

  /**
   * Ghi text vào DATA + sync sang DOM.
   * Dùng cho programmatic set (undo/redo, deserialize, paste).
   */
  setText(text) {
    this._text = text;
    this.element.innerText = text;
  }

  /**
   * Sync text từ DOM → DATA.
   * GỌI KHI: user kết thúc contentEditable editing hoặc cần đọc text mới nhất.
   */
  syncTextFromDOM() {
    this._text = this.element.innerText;
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
      text: this._text,
    };
  }

  async serializeForSave() {
    return {
      ...this.serializeBase(),
      text: this._text,
    };
  }

  async serializeForClipboard() {
    return {
      ...this.serializeBase(),
      text: this._text,
    };
  }
}
