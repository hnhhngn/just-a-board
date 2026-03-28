const INDEX_KEY = 'jab-index';
const DATA_PREFIX = 'jab-data-';

/**
 * Lấy danh sách metadata các Board.
 */
export async function getIndex() {
  const raw = localStorage.getItem(INDEX_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveBoardIndex(index) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(index));
}

/**
 * Tạo Board mới, trả về metadata.
 */
export async function create(name = 'Board mới') {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const index = await getIndex();
  const board = { id, name, lastModified: Date.now() };
  index.push(board);
  saveBoardIndex(index);
  return board;
}

/**
 * Xóa Board theo ID.
 */
export async function remove(id) {
  let index = await getIndex();
  index = index.filter((b) => b.id !== id);
  saveBoardIndex(index);
  localStorage.removeItem(DATA_PREFIX + id);
}

/**
 * Lưu dữ liệu Board.
 */
export async function save(id, jsonString) {
  localStorage.setItem(DATA_PREFIX + id, jsonString);
  const index = await getIndex();
  const board = index.find((b) => b.id === id);
  if (board) {
    board.lastModified = Date.now();
    saveBoardIndex(index);
  }
}

/**
 * Đọc dữ liệu Board.
 */
export async function load(id) {
  return localStorage.getItem(DATA_PREFIX + id);
}

/**
 * Đổi tên Board.
 */
export async function rename(id, newName) {
  const index = await getIndex();
  const board = index.find((b) => b.id === id);
  if (board) {
    board.name = newName;
    saveBoardIndex(index);
  }
}
