const INDEX_KEY = 'jab-index';
const DATA_PREFIX = 'jab-data-';

/**
 * Lấy danh sách metadata các Board.
 */
export function getBoardIndex() {
  const raw = localStorage.getItem(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveBoardIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

/**
 * Tạo Board mới, trả về metadata.
 */
export function createBoard(name = 'Board mới') {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const index = getBoardIndex();
  const board = { id, name, lastModified: Date.now() };
  index.push(board);
  saveBoardIndex(index);
  return board;
}

/**
 * Xóa Board theo ID.
 */
export function deleteBoard(id) {
  let index = getBoardIndex();
  index = index.filter((b) => b.id !== id);
  saveBoardIndex(index);
  localStorage.removeItem(DATA_PREFIX + id);
}

/**
 * Lưu dữ liệu Board.
 */
export function saveBoardData(id, jsonString) {
  localStorage.setItem(DATA_PREFIX + id, jsonString);
  const index = getBoardIndex();
  const board = index.find((b) => b.id === id);
  if (board) {
    board.lastModified = Date.now();
    saveBoardIndex(index);
  }
}

/**
 * Đọc dữ liệu Board.
 */
export function loadBoardData(id) {
  return localStorage.getItem(DATA_PREFIX + id);
}

/**
 * Đổi tên Board.
 */
export function renameBoard(id, newName) {
  const index = getBoardIndex();
  const board = index.find((b) => b.id === id);
  if (board) {
    board.name = newName;
    saveBoardIndex(index);
  }
}

/**
 * Di chuyển dữ liệu cũ (single-board) sang hệ thống mới (multi-board).
 * Trả về ID board đã migrate, hoặc null.
 */
export function migrateIfNeeded() {
  const oldData = localStorage.getItem('just-a-board');
  if (oldData && getBoardIndex().length === 0) {
    const board = createBoard('Board mặc định');
    saveBoardData(board.id, oldData);
    localStorage.removeItem('just-a-board');
    return board.id;
  }
  return null;
}
