import { serializeForClipboard } from './storage/BoardSerializer.js';

const CLIPBOARD_PREFIX = 'JAB_OBJECTS:';

let _fallbackClipboardText = '';

function safeParseEnvelope(text) {
  if (!text || !text.startsWith(CLIPBOARD_PREFIX)) return null;

  try {
    const payload = JSON.parse(text.slice(CLIPBOARD_PREFIX.length));
    if (!payload || !Array.isArray(payload.items)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function buildClipboardText(objects) {
  const payload = {
    version: 1,
    items: await serializeForClipboard(objects),
  };
  return CLIPBOARD_PREFIX + JSON.stringify(payload);
}

export async function writeObjectsToClipboard(objects) {
  const text = await buildClipboardText(objects);
  _fallbackClipboardText = text;

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback nội bộ vẫn còn.
    }
  }

  return text;
}

export async function copyObjectsToClipboardEvent(event, objects) {
  const text = await buildClipboardText(objects);
  _fallbackClipboardText = text;
  event.clipboardData.setData('text/plain', text);
  event.preventDefault();
}

function extractImageBlobsFromItems(items) {
  const blobs = [];
  for (const item of items || []) {
    if (item.type?.startsWith('image/')) {
      const file = item.getAsFile ? item.getAsFile() : null;
      if (file) blobs.push(file);
    }
  }
  return blobs;
}

export function readClipboardContentFromEvent(event) {
  const imageBlobs = extractImageBlobsFromItems(event.clipboardData?.items);
  if (imageBlobs.length > 0) {
    return { kind: 'images', blobs: imageBlobs };
  }

  const text = event.clipboardData?.getData('text/plain') || '';
  const envelope = safeParseEnvelope(text);
  if (envelope) {
    _fallbackClipboardText = text;
    return { kind: 'objects', payload: envelope };
  }

  return null;
}

export async function readClipboardContent() {
  if (navigator.clipboard?.read) {
    try {
      const items = await navigator.clipboard.read();
      const imageBlobs = [];

      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          imageBlobs.push(await item.getType(imageType));
        }
      }

      if (imageBlobs.length > 0) {
        return { kind: 'images', blobs: imageBlobs };
      }

      for (const item of items) {
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          const envelope = safeParseEnvelope(text);
          if (envelope) {
            _fallbackClipboardText = text;
            return { kind: 'objects', payload: envelope };
          }
        }
      }
    } catch {
      // Fallback readText bên dưới.
    }
  }

  if (navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      const envelope = safeParseEnvelope(text);
      if (envelope) {
        _fallbackClipboardText = text;
        return { kind: 'objects', payload: envelope };
      }
    } catch {
      // Fallback nội bộ bên dưới.
    }
  }

  const fallbackEnvelope = safeParseEnvelope(_fallbackClipboardText);
  return fallbackEnvelope ? { kind: 'objects', payload: fallbackEnvelope } : null;
}
