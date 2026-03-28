import { state } from './state.js';

// --- SPATIAL GRID PARTITIONING ---
const GRID_SIZE = 500;
const spatialGrid = new Map(); // cellKey (number) => Set of objects
export let currentlyVisibleObjects = new Set();

export function setCurrentlyVisibleObjects(newSet) {
  currentlyVisibleObjects = newSet;
}

/**
 * Mã hóa cell (x, y) thành một số duy nhất — nhanh hơn string concatenation.
 * Dùng Cantor-variant: shift x 16 bit rồi OR với y (hỗ trợ ±32767).
 */
function encodeCellKey(cx, cy) {
  return ((cx + 32768) << 16) | (cy + 32768);
}

function getGridCells(obj) {
  const minX = Math.floor(obj.x / GRID_SIZE);
  const maxX = Math.floor((obj.x + obj.width) / GRID_SIZE);
  const minY = Math.floor(obj.y / GRID_SIZE);
  const maxY = Math.floor((obj.y + obj.height) / GRID_SIZE);
  const cells = [];
  for (let cx = minX; cx <= maxX; cx++) {
    for (let cy = minY; cy <= maxY; cy++) {
      cells.push(encodeCellKey(cx, cy));
    }
  }
  return cells;
}

export function addObjectToGrid(obj) {
  obj.gridCells = getGridCells(obj);
  for (let i = 0; i < obj.gridCells.length; i++) {
    const key = obj.gridCells[i];
    let cell = spatialGrid.get(key);
    if (!cell) {
      cell = new Set();
      spatialGrid.set(key, cell);
    }
    cell.add(obj);
  }
}

export function removeObjectFromGrid(obj) {
  if (!obj.gridCells) return;
  for (let i = 0; i < obj.gridCells.length; i++) {
    const cell = spatialGrid.get(obj.gridCells[i]);
    if (cell) cell.delete(obj);
  }
}

export function updateObjectInGrid(obj) {
  const newCells = getGridCells(obj);

  // So sánh nhanh: cùng số lượng cells và cùng giá trị → không cần update
  const old = obj.gridCells;
  if (old && old.length === newCells.length) {
    let same = true;
    for (let i = 0; i < old.length; i++) {
      if (old[i] !== newCells[i]) { same = false; break; }
    }
    if (same) return;
  }

  removeObjectFromGrid(obj);
  obj.gridCells = newCells;
  for (let i = 0; i < newCells.length; i++) {
    const key = newCells[i];
    let cell = spatialGrid.get(key);
    if (!cell) {
      cell = new Set();
      spatialGrid.set(key, cell);
    }
    cell.add(obj);
  }
}

/**
 * Lấy tập hợp các đối tượng ứng viên nằm trong vùng Viewport (dựa trên lưới).
 */
export function getVisibleCandidates(vLeft, vTop, vRight, vBottom, margin) {
  const minCellX = Math.floor((vLeft - margin) / GRID_SIZE);
  const maxCellX = Math.floor((vRight + margin) / GRID_SIZE);
  const minCellY = Math.floor((vTop - margin) / GRID_SIZE);
  const maxCellY = Math.floor((vBottom + margin) / GRID_SIZE);

  const candidates = new Set();
  for (let cx = minCellX; cx <= maxCellX; cx++) {
    for (let cy = minCellY; cy <= maxCellY; cy++) {
      const cell = spatialGrid.get(encodeCellKey(cx, cy));
      if (cell) {
        cell.forEach(obj => candidates.add(obj));
      }
    }
  }
  return candidates;
}

/**
 * Xóa toàn bộ dữ liệu lưới — dùng khi chuyển Board.
 */
export function clearGrid() {
  spatialGrid.clear();
  currentlyVisibleObjects.clear();
}
