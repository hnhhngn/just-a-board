import { BaseWidget } from './BaseWidget.js';

/**
 * Chuyển blob URL thành data URL (base64) để lưu trữ.
 */
async function toDataUrl(src) {
  if (src.startsWith('data:')) return src;
  const res = await fetch(src);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export class ImageWidget extends BaseWidget {
  constructor(x, y, src) {
    super('image', x, y, 300, 300);
    this.element.src = src;
  }

  createElement() {
    const img = document.createElement('img');
    img.className = 'board-object image-widget';
    img.addEventListener('dragstart', (e) => e.preventDefault());
    return img;
  }

  /**
   * Override attachTo: cập nhật kích thước sau khi ảnh tải xong.
   * Trả về callback onSizeReady để bên ngoài cập nhật Grid.
   */
  attachTo(parent, onSizeReady) {
    parent.appendChild(this.element);
    if (this.element.complete && this.element.naturalWidth) {
      this.updateSize();
    } else {
      this.element.onload = () => {
        this.updateSize();
        if (onSizeReady) onSizeReady(this);
      };
    }
  }

  async serialize() {
    const src = await toDataUrl(this.element.src);
    return {
      ...super.serialize(),
      src,
    };
  }
}
