const viewport = document.getElementById("viewport");
const world = document.getElementById("world");

// --- CẤU HÌNH HỆ THỐNG ---
const settings = {
  useLerp: false, // Bật/tắt chế độ làm mượt
  pansEase: 0.2, // Tốc độ đuổi theo của Pan
  zoomEase: 0.15, // Tốc độ đuổi theo của Zoom
  epsilon: 0.001, // Sai số cho phép để dừng engine
};

// --- 1. KHAI BÁO TRẠNG THÁI (STATE) ---
let isLoopRunning = false;
let isDirty = false;
let isPanning = false;
let startX = 0,
  startY = 0;

// State của bảng (Transform)
let targetX = 0,
  targetY = 0,
  targetScale = 1;
let currentX = 0,
  currentY = 0,
  currentScale = 1;

// Các biến bổ sung để theo dõi điểm neo
let anchorMouseX = 0;
let anchorMouseY = 0;
let anchorWorldX = 0;
let anchorWorldY = 0;
let isZooming = false;

// Mảng chứa tham chiếu đến các note/image trên bảng
let objects = [];

// --- TỐI ƯU: GRID & DRAG DELEGATION ---
const GRID_SIZE = 500;
const spatialGrid = new Map(); // "x,y" => Set of objects
let currentlyVisibleObjects = new Set();

let activeDragObject = null;
let dragStartX = 0;
let dragStartY = 0;
let dragStartLeft = 0;
let dragStartTop = 0;

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

function addObjectToGrid(obj) {
  obj.gridCells = getGridCells(obj);
  obj.gridCells.forEach((cellId) => {
    if (!spatialGrid.has(cellId)) spatialGrid.set(cellId, new Set());
    spatialGrid.get(cellId).add(obj);
  });
}

function removeObjectFromGrid(obj) {
  if (!obj.gridCells) return;
  obj.gridCells.forEach((cellId) => {
    if (spatialGrid.has(cellId)) spatialGrid.get(cellId).delete(obj);
  });
}

function updateObjectInGrid(obj) {
  const newCells = getGridCells(obj);
  const oldCellsStr = obj.gridCells ? obj.gridCells.join("|") : "";
  const newCellsStr = newCells.join("|");
  if (oldCellsStr !== newCellsStr) {
    removeObjectFromGrid(obj);
    addObjectToGrid(obj);
  }
}
// --------------------------------------

// --- 2. HỆ THỐNG ENGINE (RENDER LOOP) ---

function wakeUp() {
  isDirty = true;
  if (!isLoopRunning) {
    isLoopRunning = true;
    requestAnimationFrame(animate);
  }
}

// Hàm chính của engine, chạy mỗi frame khi isDirty = true
function animate() {
  isDirty = false;

  if (settings.useLerp) {
    // --- CHẾ ĐỘ LÀM MƯỢT (LERP) ---

    // 1. Xử lý Zoom (Ghim điểm neo)
    const ds = targetScale - currentScale;
    if (Math.abs(ds) > settings.epsilon * 0.01) {
      currentScale += ds * settings.zoomEase;

      // Công thức "Ghim điểm neo": Giữ điểm WorldX/Y cố định dưới tọa độ MouseX/Y
      currentX = anchorMouseX - anchorWorldX * currentScale;
      currentY = anchorMouseY - anchorWorldY * currentScale;

      // Đồng bộ hóa target để khi buông Zoom chuyển sang Pan không bị giật ngược
      targetX = currentX;
      targetY = currentY;
      isDirty = true;
    } else {
      currentScale = targetScale;
      isZooming = false;
    }

    // 2. Xử lý Pan (Chỉ chạy khi không đang khớp Zoom)
    if (!isZooming) {
      const dx = targetX - currentX;
      const dy = targetY - currentY;
      if (Math.abs(dx) > settings.epsilon || Math.abs(dy) > settings.epsilon) {
        currentX += dx * settings.pansEase;
        currentY += dy * settings.pansEase;
        isDirty = true;
      } else {
        currentX = targetX;
        currentY = targetY;
      }
    }
  } else {
    // --- CHẾ ĐỘ TỨC THÌ (NO LERP) ---
    currentX = targetX;
    currentY = targetY;
    currentScale = targetScale;
    isZooming = false;
    // isDirty vẫn là false, engine sẽ render 1 lần rồi nghỉ
  }

  render();

  if (isDirty) {
    requestAnimationFrame(animate);
  } else {
    isLoopRunning = false;
    console.log("Engine Idle");
  }
}

function render() {
  // Sử dụng translate3d để tối ưu GPU
  world.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) scale(${currentScale})`;

  // TÍNH TOÁN VÙNG NHÌN THẤY
  const vLeft = -currentX / currentScale;
  const vTop = -currentY / currentScale;
  const vRight = vLeft + window.innerWidth / currentScale;
  const vBottom = vTop + window.innerHeight / currentScale;

  // BUFFER (Lề): Hiển thị thêm một chút xung quanh để tránh bị "khựng" khi kéo nhanh
  const margin = 100 / currentScale;

  // Lấy các ô lưới nằm trong Viewport
  const minCellX = Math.floor((vLeft - margin) / GRID_SIZE);
  const maxCellX = Math.floor((vRight + margin) / GRID_SIZE);
  const minCellY = Math.floor((vTop - margin) / GRID_SIZE);
  const maxCellY = Math.floor((vBottom + margin) / GRID_SIZE);

  const visibleCandidates = new Set();
  for (let x = minCellX; x <= maxCellX; x++) {
    for (let y = minCellY; y <= maxCellY; y++) {
      const cellId = `${x},${y}`;
      if (spatialGrid.has(cellId)) {
        spatialGrid.get(cellId).forEach(obj => visibleCandidates.add(obj));
      }
    }
  }

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

  currentlyVisibleObjects = newVisibleObjects;

  // console.log(`Objects: ${objects.length}, Candidates: ${visibleCandidates.size}, Visible: ${currentlyVisibleObjects.size}`);
}

// --- 3. LOGIC TƯƠNG TÁC BẢNG (PAN & ZOOM) ---

viewport.addEventListener("mousedown", (e) => {
  // --- XỬ LÝ KÉO NOTE (DELEGATION) ---
  const noteEl = e.target.closest('.note');
  if (noteEl && noteEl.__data) {
    e.stopPropagation(); // Chặn pan bảng
    activeDragObject = noteEl.__data;
    
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragStartLeft = activeDragObject.x;
    dragStartTop = activeDragObject.y;
    noteEl.style.zIndex = 1000;
    return;
  }

  // --- XỬ LÝ PAN BẢNG ---
  if (e.target !== viewport && e.target !== world) return;
  
  e.preventDefault(); // Chặn hiện tượng nháy bôi đen văn bản/ảnh của trình duyệt làm lỡ mouseup

  isPanning = true;
  startX = e.clientX - targetX;
  startY = e.clientY - targetY;
});

window.addEventListener("mousemove", (e) => {
  // Sửa lỗi kẹt chuột: nếu người dùng thả chuột nhưng browser "nuốt" sự kiện mouseup
  // (ví dụ: đang kéo dính vào một text selection, hoặc di chuyển ngoài cửa sổ trình duyệt rồi thả ra)
  if (e.buttons === 0) {
    if (activeDragObject) {
      activeDragObject.element.style.zIndex = "";
      activeDragObject = null;
    }
    isPanning = false;
    return;
  }

  if (activeDragObject) {
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    activeDragObject.x = dragStartLeft + dx / targetScale;
    activeDragObject.y = dragStartTop + dy / targetScale;

    activeDragObject.element.style.left = `${activeDragObject.x}px`;
    activeDragObject.element.style.top = `${activeDragObject.y}px`;

    updateObjectInGrid(activeDragObject);
    return;
  }

  if (!isPanning) return;

  targetX = e.clientX - startX;
  targetY = e.clientY - startY;
  wakeUp();
});

window.addEventListener("mouseup", () => {
  if (activeDragObject) {
    activeDragObject.element.style.zIndex = "";
    activeDragObject = null;
  }
  isPanning = false;
});

viewport.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();

    // 1. Lưu vị trí chuột (Anchor)
    anchorMouseX = e.clientX;
    anchorMouseY = e.clientY;

    // 2. Điểm neo trong thế giới (Dùng currentScale để tính, không dùng target)
    anchorWorldX = (anchorMouseX - currentX) / currentScale;
    anchorWorldY = (anchorMouseY - currentY) / currentScale;

    // 3. Cập nhật targetScale
    const delta = -e.deltaY * 0.001;
    targetScale = Math.min(Math.max(0.1, targetScale + delta), 5);

    isZooming = true; // Đặt cờ đang trong chế độ Zoom
    wakeUp();
  },
  { passive: false },
);

// --- 4. LOGIC GHI CHÚ & HÌNH ẢNH (OBJECTS) ---

// Double click để tạo ghi chú
viewport.addEventListener("dblclick", (e) => {
  if (e.target !== viewport && e.target !== world) return;

  const x = (e.clientX - targetX) / targetScale;
  const y = (e.clientY - targetY) / targetScale;

  createNote(x, y);
});

function createNote(x, y) {
  const note = document.createElement("div");
  note.className = "note";
  note.contentEditable = true;
  note.innerText = "Ghi chú mới...";
  note.style.left = `${x}px`;
  note.style.top = `${y}px`;

  world.appendChild(note); // Thêm vào DOM trước để lấy kích thước

  // Lưu thông tin với kích thước thực tế
  const newObj = {
    element: note,
    x: x,
    y: y,
    width: note.offsetWidth || 200,
    height: note.offsetHeight || 100,
    isVisible: true
  };
  note.__data = newObj;
  
  objects.push(newObj);
  addObjectToGrid(newObj);
  currentlyVisibleObjects.add(newObj);

  wakeUp();
}

// Dán hình ảnh từ clipboard
window.addEventListener("paste", (e) => {
  const items = e.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf("image") !== -1) {
      const blob = item.getAsFile();
      const url = URL.createObjectURL(blob);

      const x = (window.innerWidth / 2 - targetX) / targetScale;
      const y = (window.innerHeight / 2 - targetY) / targetScale;

      const img = document.createElement("img");
      img.src = url;
      img.className = "note image-note";
      img.style.left = `${x}px`;
      img.style.top = `${y}px`;

      // Chặn sự kiện kéo ảnh mặc định của trình duyệt
      img.addEventListener("dragstart", (e) => e.preventDefault());

      world.appendChild(img);

      const newObj = {
        element: img,
        x: x,
        y: y,
        width: 300, // Kích thước dự phòng
        height: 300,
        isVisible: true
      };
      img.__data = newObj;
      
      img.onload = () => {
          newObj.width = img.offsetWidth;
          newObj.height = img.offsetHeight;
          updateObjectInGrid(newObj);
      };

      objects.push(newObj);
      addObjectToGrid(newObj);
      currentlyVisibleObjects.add(newObj);

      wakeUp();
    }
  }
});
