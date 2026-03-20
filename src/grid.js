import { state } from './state.js';

// --- SPATIAL GRID PARTITIONING ---
const GRID_SIZE = 500;
const spatialGrid = new Map(); // "x,y" => Set of objects
export let currentlyVisibleObjects = new Set();

export function setCurrentlyVisibleObjects(newSet) {
  currentlyVisibleObjects = newSet;
}

function getGridCells(obj) {
  const minX = Math.floor(obj.x / GRID_SIZE);
  const maxX = Math.floor((obj.x + obj.width) / GRID_SIZE);
  const minY = Math.floor(obj.y / GRID_SIZE);
  const maxY = Math.floor((obj.y + obj.height) / GRID_SIZE);
  const cells = [];
  for (let x = minX; x <= Math.max(minX, maxX); x++) {
    for (let y = minY; y <= Math.max(minY, maxY); y++) {
      cells.push(`${x},${y}`);
    }
  }
  return cells;
}

export function addObjectToGrid(obj) {
  obj.gridCells = getGridCells(obj);
  obj.gridCells.forEach((cellId) => {
    if (!spatialGrid.has(cellId)) spatialGrid.set(cellId, new Set());
    spatialGrid.get(cellId).add(obj);
  });
}

export function removeObjectFromGrid(obj) {
  if (!obj.gridCells) return;
  obj.gridCells.forEach((cellId) => {
    if (spatialGrid.has(cellId)) spatialGrid.get(cellId).delete(obj);
  });
}

export function updateObjectInGrid(obj) {
  const newCells = getGridCells(obj);
  const oldCellsStr = obj.gridCells ? obj.gridCells.join("|") : "";
  const newCellsStr = newCells.join("|");
  if (oldCellsStr !== newCellsStr) {
    removeObjectFromGrid(obj);
    addObjectToGrid(obj);
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
  for (let x = minCellX; x <= maxCellX; x++) {
    for (let y = minCellY; y <= maxCellY; y++) {
      const cellId = `${x},${y}`;
      if (spatialGrid.has(cellId)) {
        spatialGrid.get(cellId).forEach(obj => candidates.add(obj));
      }
    }
  }
  return candidates;
}
