/**
 * DraftWorker — Chạy trong Web Worker thread.
 * Nhận data array từ main thread, JSON.stringify, ghi vào IndexedDB.
 * Main thread hoàn toàn không bị block bởi stringify hay IDB operations.
 */

const DB_NAME = 'jab-draft-store';
const DB_VERSION = 1;
const DRAFTS_STORE = 'drafts';
const ASSETS_STORE = 'assets';

let _db = null;

function openDb() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DRAFTS_STORE)) {
        db.createObjectStore(DRAFTS_STORE, { keyPath: 'boardId' });
      }
      if (!db.objectStoreNames.contains(ASSETS_STORE)) {
        const store = db.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
        store.createIndex('boardId', 'boardId', { unique: false });
      }
    };

    request.onsuccess = () => { _db = request.result; resolve(_db); };
    request.onerror = () => reject(request.error);
  });
}

function idbRequest(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbTransaction(storeName, mode, fn) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const result = fn(tx.objectStore(storeName));
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
}

/**
 * Serialize data array → JSON string, extract asset IDs, write to IDB.
 */
async function persistDraft(boardId, dataArray) {
  const snapshot = JSON.stringify(dataArray);

  // Extract asset IDs từ data (thay vì parse lại JSON)
  const assetIds = dataArray
    .filter(item => item.type === 'image' && item.sourceKind === 'draft-asset' && item.assetId)
    .map(item => item.assetId);

  const keepIds = new Set(assetIds);

  // Đọc draft cũ để tìm orphan assets
  const db = await openDb();
  const readTx = db.transaction([DRAFTS_STORE, ASSETS_STORE], 'readonly');
  const existingDraft = await idbRequest(readTx.objectStore(DRAFTS_STORE).get(boardId));
  const existingAssets = await idbRequest(readTx.objectStore(ASSETS_STORE).index('boardId').getAll(boardId));

  const orphanIds = new Set();
  existingAssets.forEach(asset => {
    if (!keepIds.has(asset.id)) orphanIds.add(asset.id);
  });
  if (existingDraft?.assetIds) {
    existingDraft.assetIds.forEach(id => {
      if (!keepIds.has(id)) orphanIds.add(id);
    });
  }

  // Ghi draft mới + xóa orphan assets trong 1 transaction
  const writeTx = db.transaction([DRAFTS_STORE, ASSETS_STORE], 'readwrite');
  writeTx.objectStore(DRAFTS_STORE).put({
    boardId,
    snapshot,
    assetIds: [...keepIds],
    updatedAt: Date.now(),
  });

  orphanIds.forEach(id => {
    writeTx.objectStore(ASSETS_STORE).delete(id);
  });

  return new Promise((resolve, reject) => {
    writeTx.oncomplete = () => resolve();
    writeTx.onerror = () => reject(writeTx.error);
    writeTx.onabort = () => reject(writeTx.error);
  });
}

/**
 * Xóa draft cho board.
 */
async function clearDraft(boardId) {
  const db = await openDb();
  const tx = db.transaction([DRAFTS_STORE, ASSETS_STORE], 'readwrite');

  tx.objectStore(DRAFTS_STORE).delete(boardId);

  const assets = await idbRequest(tx.objectStore(ASSETS_STORE).index('boardId').getAll(boardId));
  assets.forEach(asset => tx.objectStore(ASSETS_STORE).delete(asset.id));

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// --- MESSAGE HANDLER ---

self.addEventListener('message', async (event) => {
  const { id, action, payload } = event.data;

  try {
    switch (action) {
      case 'persistDraft': {
        await persistDraft(payload.boardId, payload.dataArray);
        self.postMessage({ id, ok: true });
        break;
      }
      case 'clearDraft': {
        await clearDraft(payload.boardId);
        self.postMessage({ id, ok: true });
        break;
      }
      default:
        self.postMessage({ id, ok: false, error: `Unknown action: ${action}` });
    }
  } catch (error) {
    self.postMessage({ id, ok: false, error: error.message });
  }
});
