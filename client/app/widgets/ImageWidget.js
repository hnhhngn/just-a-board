import { BaseWidget } from './BaseWidget.js';

/**
 * Lazy upload: Nếu phát hiện Blob URL, đẩy mảng bytes lên Server,
 * sau đó đổi source thành Server URL (/images/...) để Serialize cực nhẹ.
 */
async function ensureUploaded(src) {
  if (!src.startsWith('blob:')) return src; // Đã upload rồi, hoặc là data url cũ
  
  const res = await fetch(src);
  const blob = await res.blob();
  
  // POST file bin lên endpoint /api/images
  const uploadRes = await fetch('/api/images', {
    method: 'POST',
    body: blob
  });
  
  if (!uploadRes.ok) throw new Error('Upload failed');
  const data = await uploadRes.json();
  
  return data.url;
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
    // Lấy link gốc bằng getAttribute để tránh DOM tự ép thành http://localhost...
    const currentSrc = this.element.getAttribute('src') || this.element.src;
    const serverUrl = await ensureUploaded(currentSrc);
    this.element.setAttribute('src', serverUrl);

    return {
      ...super.serialize(),
      src: serverUrl,
    };
  }
}
