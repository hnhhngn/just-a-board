/**
 * DraftWorkerClient — Main thread wrapper cho DraftWorker.
 * Quản lý Worker lifecycle và message routing.
 * Fallback về main-thread DraftStore nếu Worker không available.
 */

import { saveDraft as fallbackSaveDraft, clearDraft as fallbackClearDraft } from './DraftStore.js';

let _worker = null;
let _msgId = 0;
const _pending = new Map();

function getWorker() {
  if (_worker) return _worker;

  try {
    _worker = new Worker(
      new URL('./DraftWorker.js', import.meta.url),
      { type: 'module' }
    );

    _worker.addEventListener('message', (event) => {
      const { id, ok, error } = event.data;
      const entry = _pending.get(id);
      if (!entry) return;
      _pending.delete(id);
      if (ok) {
        entry.resolve();
      } else {
        entry.reject(new Error(error || 'Worker error'));
      }
    });

    _worker.addEventListener('error', (event) => {
      console.warn('[DraftWorkerClient] Worker error, falling back to main thread:', event.message);
      _worker = null;
    });

    return _worker;
  } catch (error) {
    console.warn('[DraftWorkerClient] Cannot create Worker, using main thread fallback:', error.message);
    return null;
  }
}

function postToWorker(action, payload) {
  const worker = getWorker();
  if (!worker) return null;

  const id = ++_msgId;
  return new Promise((resolve, reject) => {
    _pending.set(id, { resolve, reject });
    worker.postMessage({ id, action, payload });
  });
}

/**
 * Persist draft qua Worker (off-main-thread).
 * Nhận plain data array (đã extract từ widgets trên main thread).
 *
 * @param {string} boardId
 * @param {Array<object>} dataArray - Plain objects, không phải widget instances
 */
export async function persistDraftViaWorker(boardId, dataArray) {
  const result = postToWorker('persistDraft', { boardId, dataArray });

  if (result) {
    return result;
  }

  // Fallback: main thread
  const snapshot = JSON.stringify(dataArray);
  const assetIds = dataArray
    .filter(item => item.type === 'image' && item.sourceKind === 'draft-asset' && item.assetId)
    .map(item => item.assetId);
  return fallbackSaveDraft(boardId, snapshot, assetIds);
}

/**
 * Clear draft qua Worker.
 */
export async function clearDraftViaWorker(boardId) {
  const result = postToWorker('clearDraft', { boardId });

  if (result) {
    return result;
  }

  // Fallback: main thread
  return fallbackClearDraft(boardId);
}
