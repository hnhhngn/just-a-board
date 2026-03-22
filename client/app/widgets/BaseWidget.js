/**
 * BaseWidget — Lớp cơ sở cho mọi đối tượng trên Board.
 * Mọi Widget (Note, Image, Shape,...) đều kế thừa từ lớp này.
 */
export class BaseWidget {
  constructor(type, x, y, width, height) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.isVisible = true;
    this.gridCells = null;

    this.element = this.createElement();
    this.element.__data = this;
    this.setPosition(x, y);
    this.setSize(width, height);
  }

  /**
   * Tạo DOM element — BẮT BUỘC override ở lớp con.
   */
  createElement() {
    throw new Error(`Widget "${this.type}" chưa implement createElement()`);
  }

  /**
   * Serialize dữ liệu ra plain object để lưu trữ.
   * Override ở lớp con để thêm dữ liệu riêng (text, src,...).
   */
  serializeBase() {
    return { type: this.type, x: this.x, y: this.y, width: this.width, height: this.height };
  }

  async serializeDraft() {
    return this.serializeBase();
  }

  async serializeForSave() {
    return this.serializeBase();
  }

  async serializeForClipboard() {
    return this.serializeBase();
  }

  /**
   * Đặt vị trí widget trong World.
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.element.style.left = `${x}px`;
    this.element.style.top = `${y}px`;
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;

    if (typeof width === 'number' && Number.isFinite(width)) {
      this.element.style.width = `${Math.max(24, width)}px`;
      this.width = Math.max(24, width);
    }

    if (typeof height === 'number' && Number.isFinite(height)) {
      this.element.style.height = `${Math.max(24, height)}px`;
      this.height = Math.max(24, height);
    }
  }

  /**
   * Gắn widget vào DOM và cập nhật kích thước thực tế.
   */
  attachTo(parent, onSizeReady) {
    parent.appendChild(this.element);
    this.updateSize();
    if (onSizeReady) onSizeReady(this);
  }

  /**
   * Gỡ widget khỏi DOM.
   */
  detach() {
    this.element.remove();
  }

  /**
   * Cập nhật kích thước dựa trên DOM thực tế.
   */
  updateSize() {
    this.width = this.element.offsetWidth || this.width;
    this.height = this.element.offsetHeight || this.height;
  }
}
