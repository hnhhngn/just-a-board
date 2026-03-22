const DB_NAME = 'jab-draft-store';
const DB_VERSION = 1;
const DRAFTS_STORE = 'drafts';
const ASSETS_STORE = 'assets';

let _dbPromise = null;

function openDb() {
  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return _dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getFromStore(storeName, key) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestToPromise(tx.objectStore(storeName).get(key));
}

async function putInStore(storeName, value) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  await requestToPromise(tx.objectStore(storeName).put(value));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function deleteFromStore(storeName, key) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  await requestToPromise(tx.objectStore(storeName).delete(key));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function getAllKeys(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  return requestToPromise(tx.objectStore(storeName).getAllKeys());
}

async function getAllAssetsByBoard(boardId) {
  const db = await openDb();
  const tx = db.transaction(ASSETS_STORE, 'readonly');
  const index = tx.objectStore(ASSETS_STORE).index('boardId');
  return requestToPromise(index.getAll(boardId));
}

function generateId(prefix = 'draft') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function dataUrlToBlob(dataUrl) {
  const [meta, data] = dataUrl.split(',');
  const mimeMatch = meta.match(/data:(.*?);base64/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function loadDraft(boardId) {
  if (!boardId) return null;
  return getFromStore(DRAFTS_STORE, boardId);
}

export async function saveDraft(boardId, snapshot, assetIds = []) {
  if (!boardId) return;

  const keepIds = new Set(assetIds);
  const existing = await loadDraft(boardId);

  await putInStore(DRAFTS_STORE, {
    boardId,
    snapshot,
    assetIds: [...keepIds],
    updatedAt: Date.now(),
  });

  const existingAssets = await getAllAssetsByBoard(boardId);
  const extraIds = existingAssets
    .map((asset) => asset.id)
    .filter((id) => !keepIds.has(id));

  if (existing?.assetIds) {
    existing.assetIds.forEach((id) => {
      if (!keepIds.has(id)) extraIds.push(id);
    });
  }

  const uniqueIds = [...new Set(extraIds)];
  await Promise.all(uniqueIds.map((id) => deleteFromStore(ASSETS_STORE, id)));
}

export async function clearDraft(boardId) {
  if (!boardId) return;

  await deleteFromStore(DRAFTS_STORE, boardId);
  const assets = await getAllAssetsByBoard(boardId);
  await Promise.all(assets.map((asset) => deleteFromStore(ASSETS_STORE, asset.id)));
}

export async function listDirtyBoardIds() {
  return getAllKeys(DRAFTS_STORE);
}

export async function createImageAsset(boardId, blob) {
  const id = generateId('img');
  const mimeType = blob.type || 'image/png';

  await putInStore(ASSETS_STORE, {
    id,
    boardId,
    blob,
    mimeType,
    updatedAt: Date.now(),
  });

  return { id, mimeType };
}

export async function getAssetBlob(assetId) {
  if (!assetId) return null;
  const asset = await getFromStore(ASSETS_STORE, assetId);
  return asset ? asset.blob : null;
}

export async function assetToDataUrl(assetId) {
  const blob = await getAssetBlob(assetId);
  if (!blob) return null;
  return blobToDataUrl(blob);
}

export async function createAssetFromDataUrl(boardId, dataUrl) {
  const blob = dataUrlToBlob(dataUrl);
  return createImageAsset(boardId, blob);
}
