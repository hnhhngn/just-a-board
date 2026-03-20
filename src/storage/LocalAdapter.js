const STORAGE_KEY = 'just-a-board';

/**
 * Lưu dữ liệu board vào localStorage.
 */
export function saveBoard(jsonString) {
  localStorage.setItem(STORAGE_KEY, jsonString);
}

/**
 * Đọc dữ liệu board từ localStorage.
 * Trả về JSON string hoặc null nếu chưa có.
 */
export function loadBoard() {
  return localStorage.getItem(STORAGE_KEY);
}
