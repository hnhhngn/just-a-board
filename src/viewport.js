import { state } from './state.js';
import { wakeUp } from './engine.js';
import { updateObjectInGrid } from './grid.js';

/**
 * Khởi tạo toàn bộ sự kiện Pan, Zoom và Drag Delegation.
 */
export function initViewport(viewport, world) {
  // --- MOUSEDOWN: Pan bảng HOẶC Kéo Widget ---
  viewport.addEventListener("mousedown", (e) => {
    // --- XỬ LÝ KÉO NOTE (DELEGATION) ---
    const noteEl = e.target.closest('.note');
    if (noteEl && noteEl.__data) {
      e.stopPropagation();
      state.activeDragObject = noteEl.__data;

      state.dragStartX = e.clientX;
      state.dragStartY = e.clientY;
      state.dragStartLeft = state.activeDragObject.x;
      state.dragStartTop = state.activeDragObject.y;
      noteEl.style.zIndex = 1000;
      return;
    }

    // --- XỬ LÝ PAN BẢNG ---
    if (e.target !== viewport && e.target !== world) return;

    e.preventDefault(); // Chặn hiện tượng nháy bôi đen văn bản/ảnh

    state.isPanning = true;
    state.startX = e.clientX - state.targetX;
    state.startY = e.clientY - state.targetY;
  });

  // --- MOUSEMOVE: Kéo Widget hoặc Pan ---
  window.addEventListener("mousemove", (e) => {
    // Failsafe: phát hiện chuột đã thả nhưng browser nuốt mouseup
    if (e.buttons === 0) {
      if (state.activeDragObject) {
        state.activeDragObject.element.style.zIndex = "";
        state.activeDragObject = null;
      }
      state.isPanning = false;
      return;
    }

    if (state.activeDragObject) {
      const dx = e.clientX - state.dragStartX;
      const dy = e.clientY - state.dragStartY;

      state.activeDragObject.x = state.dragStartLeft + dx / state.targetScale;
      state.activeDragObject.y = state.dragStartTop + dy / state.targetScale;

      state.activeDragObject.element.style.left = `${state.activeDragObject.x}px`;
      state.activeDragObject.element.style.top = `${state.activeDragObject.y}px`;

      updateObjectInGrid(state.activeDragObject);
      return;
    }

    if (!state.isPanning) return;

    state.targetX = e.clientX - state.startX;
    state.targetY = e.clientY - state.startY;
    wakeUp();
  });

  // --- MOUSEUP: Nhả chuột ---
  window.addEventListener("mouseup", () => {
    if (state.activeDragObject) {
      state.activeDragObject.element.style.zIndex = "";
      state.activeDragObject = null;
    }
    state.isPanning = false;
  });

  // --- WHEEL: Zoom ---
  viewport.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      // 1. Lưu vị trí chuột (Anchor)
      state.anchorMouseX = e.clientX;
      state.anchorMouseY = e.clientY;

      // 2. Điểm neo trong thế giới
      state.anchorWorldX = (state.anchorMouseX - state.currentX) / state.currentScale;
      state.anchorWorldY = (state.anchorMouseY - state.currentY) / state.currentScale;

      // 3. Cập nhật targetScale
      const delta = -e.deltaY * 0.001;
      state.targetScale = Math.min(Math.max(0.1, state.targetScale + delta), 5);

      state.isZooming = true;
      wakeUp();
    },
    { passive: false },
  );
}
