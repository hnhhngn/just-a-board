import { BaseWidget } from './BaseWidget.js';
import { assetToDataUrl, createAssetFromDataUrl, createImageAsset, getAssetBlob } from '../../services/storage/DraftStore.js';

async function uploadBlob(blob) {
  const uploadRes = await fetch('/api/images', {
    method: 'POST',
    body: blob,
  });

  if (!uploadRes.ok) {
    throw new Error('Upload failed');
  }

  const data = await uploadRes.json();
  return data.url;
}

export class ImageWidget extends BaseWidget {
  constructor(x, y, source, displaySrc, width = 300, height = 300) {
    super('image', x, y, width, height);
    this.source = source;
    this.displaySrc = displaySrc;
    this.element.src = displaySrc;
  }

  static async fromSavedUrl(x, y, src, width = 300, height = 300) {
    return new ImageWidget(
      x,
      y,
      { kind: 'saved-url', src },
      src,
      width,
      height,
    );
  }

  static async fromDraftAsset(x, y, boardId, assetId, width = 300, height = 300) {
    const blob = await getAssetBlob(assetId);
    if (!blob) {
      throw new Error(`Không tìm thấy draft asset ${assetId}`);
    }

    const displaySrc = URL.createObjectURL(blob);
    return new ImageWidget(
      x,
      y,
      { kind: 'draft-asset', boardId, assetId },
      displaySrc,
      width,
      height,
    );
  }

  static async fromBlob(x, y, boardId, blob, width = 300, height = 300) {
    const asset = await createImageAsset(boardId, blob);
    const displaySrc = URL.createObjectURL(blob);

    return new ImageWidget(
      x,
      y,
      { kind: 'draft-asset', boardId, assetId: asset.id, mimeType: asset.mimeType },
      displaySrc,
      width,
      height,
    );
  }

  static async fromClipboardData(x, y, boardId, dataUrl, width = 300, height = 300) {
    const asset = await createAssetFromDataUrl(boardId, dataUrl);
    const blob = await getAssetBlob(asset.id);
    const displaySrc = URL.createObjectURL(blob);

    return new ImageWidget(
      x,
      y,
      { kind: 'draft-asset', boardId, assetId: asset.id, mimeType: asset.mimeType },
      displaySrc,
      width,
      height,
    );
  }

  createElement() {
    const img = document.createElement('img');
    img.className = 'board-object image-widget';
    img.addEventListener('dragstart', (e) => e.preventDefault());
    return img;
  }

  attachTo(parent, onSizeReady) {
    parent.appendChild(this.element);
    if (this.element.complete && this.element.naturalWidth) {
      this.updateSize();
      if (onSizeReady) onSizeReady(this);
    } else {
      this.element.onload = () => {
        this.updateSize();
        if (onSizeReady) onSizeReady(this);
      };
    }
  }

  async serializeDraft() {
    if (this.source.kind === 'draft-asset') {
      return {
        ...this.serializeBase(),
        sourceKind: 'draft-asset',
        assetId: this.source.assetId,
      };
    }

    return {
      ...this.serializeBase(),
      sourceKind: 'saved-url',
      src: this.source.src,
    };
  }

  async serializeForSave() {
    if (this.source.kind === 'draft-asset') {
      const blob = await getAssetBlob(this.source.assetId);
      if (!blob) {
        throw new Error(`Không tìm thấy dữ liệu ảnh draft ${this.source.assetId}`);
      }

      const savedUrl = await uploadBlob(blob);
      this.source = { kind: 'saved-url', src: savedUrl };
      this.displaySrc = savedUrl;
      this.element.src = savedUrl;
    }

    return {
      ...this.serializeBase(),
      src: this.source.src,
    };
  }

  async serializeForClipboard() {
    if (this.source.kind === 'draft-asset') {
      const dataUrl = await assetToDataUrl(this.source.assetId);
      return {
        ...this.serializeBase(),
        sourceKind: 'clipboard-data-url',
        dataUrl,
      };
    }

    return {
      ...this.serializeBase(),
      sourceKind: 'saved-url',
      src: this.source.src,
    };
  }
}
