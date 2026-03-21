// --- CẤU HÌNH HỆ THỐNG ---
export const settings = {
  useLerp: false, // Bật/tắt chế độ làm mượt
  pansEase: 0.2, // Tốc độ đuổi theo của Pan
  zoomEase: 0.15, // Tốc độ đuổi theo của Zoom
  epsilon: 0.001, // Sai số cho phép để dừng engine
  showGrid: true, // Hiện/ẩn lưới chấm bi
};

// --- TRẠNG THÁI TOÀN CỤC (STATE) ---
export const state = {
  // Engine
  isLoopRunning: false,
  isDirty: false,

  // Pan
  isPanning: false,
  startX: 0,
  startY: 0,

  // Transform (Bảng)
  targetX: 0,
  targetY: 0,
  targetScale: 1,
  currentX: 0,
  currentY: 0,
  currentScale: 1,

  // Zoom Anchor
  anchorMouseX: 0,
  anchorMouseY: 0,
  anchorWorldX: 0,
  anchorWorldY: 0,
  isZooming: false,

  // Drag Delegation
  activeDragObject: null,
  dragStartX: 0,
  dragStartY: 0,
  dragStartLeft: 0,
  dragStartTop: 0,

  // Danh sách đối tượng
  objects: [],

  // HUD & Tools
  activeTool: 'select', // 'select' | 'note' | 'shape'
  currentBoardId: null,

  // Hot Exit & Sync
  hasUnsavedChanges: false, // Để so sánh với Server, tính qua isDirty()
};
