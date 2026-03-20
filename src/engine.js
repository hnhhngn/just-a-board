import { state, settings } from './state.js';
import { getVisibleCandidates, currentlyVisibleObjects, setCurrentlyVisibleObjects } from './grid.js';

let worldElement = null;

/**
 * Khởi tạo engine với tham chiếu DOM.
 */
export function initEngine(world) {
  worldElement = world;
}

/**
 * Đánh thức engine — đánh dấu cần vẽ lại và khởi động render loop nếu đang ngủ.
 */
export function wakeUp() {
  state.isDirty = true;
  if (!state.isLoopRunning) {
    state.isLoopRunning = true;
    requestAnimationFrame(animate);
  }
}

// --- RENDER LOOP (Private) ---

function animate() {
  state.isDirty = false;

  if (settings.useLerp) {
    // --- CHẾ ĐỘ LÀM MƯỢT (LERP) ---

    // 1. Xử lý Zoom (Ghim điểm neo)
    const ds = state.targetScale - state.currentScale;
    if (Math.abs(ds) > settings.epsilon * 0.01) {
      state.currentScale += ds * settings.zoomEase;

      // Công thức "Ghim điểm neo"
      state.currentX = state.anchorMouseX - state.anchorWorldX * state.currentScale;
      state.currentY = state.anchorMouseY - state.anchorWorldY * state.currentScale;

      // Đồng bộ hóa target
      state.targetX = state.currentX;
      state.targetY = state.currentY;
      state.isDirty = true;
    } else {
      state.currentScale = state.targetScale;
      state.isZooming = false;
    }

    // 2. Xử lý Pan (Chỉ chạy khi không đang khớp Zoom)
    if (!state.isZooming) {
      const dx = state.targetX - state.currentX;
      const dy = state.targetY - state.currentY;
      if (Math.abs(dx) > settings.epsilon || Math.abs(dy) > settings.epsilon) {
        state.currentX += dx * settings.pansEase;
        state.currentY += dy * settings.pansEase;
        state.isDirty = true;
      } else {
        state.currentX = state.targetX;
        state.currentY = state.targetY;
      }
    }
  } else {
    // --- CHẾ ĐỘ TỨC THÌ (NO LERP) ---
    state.currentScale = state.targetScale;

    // Khi đang zoom: tính lại vị trí từ điểm neo để zoom đúng vào con trỏ
    if (state.isZooming) {
      state.currentX = state.anchorMouseX - state.anchorWorldX * state.currentScale;
      state.currentY = state.anchorMouseY - state.anchorWorldY * state.currentScale;
      state.targetX = state.currentX;
      state.targetY = state.currentY;
      state.isZooming = false;
    } else {
      state.currentX = state.targetX;
      state.currentY = state.targetY;
    }
  }

  render();

  if (state.isDirty) {
    requestAnimationFrame(animate);
  } else {
    state.isLoopRunning = false;
  }
}

function render() {
  // Sử dụng translate3d để tối ưu GPU
  worldElement.style.transform = `translate3d(${state.currentX}px, ${state.currentY}px, 0) scale(${state.currentScale})`;

  // TÍNH TOÁN VÙNG NHÌN THẤY
  const vLeft = -state.currentX / state.currentScale;
  const vTop = -state.currentY / state.currentScale;
  const vRight = vLeft + window.innerWidth / state.currentScale;
  const vBottom = vTop + window.innerHeight / state.currentScale;

  // BUFFER (Lề)
  const margin = 100 / state.currentScale;

  // Lấy ứng viên từ Grid
  const visibleCandidates = getVisibleCandidates(vLeft, vTop, vRight, vBottom, margin);

  const newVisibleObjects = new Set();

  visibleCandidates.forEach((obj) => {
    const isVisible =
      obj.x + obj.width > vLeft - margin &&
      obj.x < vRight + margin &&
      obj.y + obj.height > vTop - margin &&
      obj.y < vBottom + margin;

    if (isVisible) {
      newVisibleObjects.add(obj);
      if (!obj.isVisible) {
        obj.element.style.display = "block";
        obj.isVisible = true;
      }
    }
  });

  currentlyVisibleObjects.forEach(obj => {
    if (!newVisibleObjects.has(obj)) {
      obj.element.style.display = "none";
      obj.isVisible = false;
    }
  });

  setCurrentlyVisibleObjects(newVisibleObjects);
}
