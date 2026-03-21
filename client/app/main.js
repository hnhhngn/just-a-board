import { state } from './state.js';
import { initEngine } from './engine.js';
import { initViewport } from './viewport.js';
import { initObjectEvents } from './objects.js';
import { clearGrid } from './grid.js';
import { CommandManager } from './commands/CommandManager.js';
import { serialize, deserialize } from './storage/BoardSerializer.js';
import { getIndex, create, remove, save, load, rename } from './storage/index.js';
import { initFloatingToolbar } from './hud/FloatingToolbar.js';
import { initSidebar } from './hud/Sidebar.js';
import { initBottomBar } from './hud/BottomBar.js';
import { initObjectList } from './hud/ObjectList.js';

// --- LẤY THAM CHIẾU DOM ---
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');

// --- KHỞI TẠO CORE ---
const commandManager = new CommandManager();
initEngine(world);

// --- KHỞI TẠO HUD ---
const toolbar = initFloatingToolbar({ onSave: handleSave });
const bottomBar = initBottomBar();
const objectList = initObjectList();

initViewport(viewport, world, commandManager);
initObjectEvents(viewport, world, commandManager, () => toolbar.resetTool());

const sidebar = initSidebar({
  getIndex,
  currentBoardId: state.currentBoardId,
  menuIcon: toolbar.menuIcon,
  onBoardSelect: async (id) => await switchBoard(id),
  onBoardCreate: async () => {
    const board = await create();
    await switchBoard(board.id);
  },
  onBoardDelete: async (id) => {
    await remove(id);
    // Nếu xóa board đang mở → chuyển sang board đầu tiên (ngăn Tái sinh rác)
    if (id === state.currentBoardId) {
      state.currentBoardId = null; // NGẮT SAVE AUTO!
      const boards = await getIndex();
      if (boards.length > 0) {
        await switchBoard(boards[0].id);
      } else {
        clearCurrentBoard();
        document.title = 'Just a board';
      }
    }
  },
  onBoardRename: async (id, newName) => {
    await rename(id, newName);
    document.title = newName;
  }
});

// --- KHỞI TẠO DỮ LIỆU ---
initializeData();

async function initializeData() {
  const boards = await getIndex();
  
  if (boards.length === 0) {
    // Lần đầu mở ứng dụng: tạo board mặc định
    const board = await create('Board mặc định');
    state.currentBoardId = board.id;
  } else {
    state.currentBoardId = boards[0].id;
  }

  await sidebar.setCurrentBoard(state.currentBoardId);
  await loadCurrentBoard();

  // Khởi động vòng lặp Auto-Backup Hot Exit (3s/lần)
  setInterval(async () => {
    if (state.needsLocalBackup && state.currentBoardId) {
      state.needsLocalBackup = false; // Reset cờ Debounce
      const json = await serialize(state.objects);
      const backupObj = { timestamp: Date.now(), data: json };
      localStorage.setItem(`jab-hot-exit-${state.currentBoardId}`, JSON.stringify(backupObj));
      updateTitle(); // Thêm dấu sao * vào title
    }
  }, 3000);
}

// --- QUẢN LÝ BOARD ---

async function updateTitle() {
  const boards = await getIndex();
  const board = boards.find((b) => b.id === state.currentBoardId);
  const name = board ? board.name : 'Just a board';
  document.title = (state.hasUnsavedChanges ? '* ' : '') + name;
}

async function loadCurrentBoard() {
  const hotExitKey = `jab-hot-exit-${state.currentBoardId}`;
  const hotExitRaw = localStorage.getItem(hotExitKey);

  // Lấy timestamp từ Server (index)
  const boards = await getIndex();
  const boardInfo = boards.find((b) => b.id === state.currentBoardId);
  const serverTimestamp = boardInfo ? boardInfo.lastModified : 0;

  if (hotExitRaw) {
    try {
      const hotExitObj = JSON.parse(hotExitRaw);
      
      // Chỉ nạp Hot Exit nếu Local thao tác GẦN ĐÂY HƠN bản lưu trên Server
      if (hotExitObj.timestamp > serverTimestamp) {
        console.log("Phục hồi nội dung từ Bản nháp (Hot Exit)!");
        deserialize(hotExitObj.data, world);
        state.hasUnsavedChanges = true;
        state.needsLocalBackup = false;
        updateTitle();
        return;
      }
    } catch(e) {
      console.warn("Dữ liệu nháp lỗi, tiến hành nạp từ Server");
    }
  }

  // Nếu không có nháp hoặc Server mới hơn
  const data = await load(state.currentBoardId);
  if (data) deserialize(data, world);
  state.hasUnsavedChanges = false;
  state.needsLocalBackup = false;
  
  updateTitle();
}

function clearCurrentBoard() {
  // Gỡ tất cả widget khỏi DOM
  state.objects.forEach((obj) => obj.detach());
  state.objects.length = 0;
  clearGrid();
  commandManager.clear();
  state.hasUnsavedChanges = false;
  state.needsLocalBackup = false;
}

async function switchBoard(boardId) {
  // 1. Lưu board hiện tại
  if (state.currentBoardId) {
    await saveCurrentBoard();
  }

  // 2. Xóa trạng thái hiện tại
  clearCurrentBoard();

  // 3. Chuyển sang board mới
  state.currentBoardId = boardId;
  await sidebar.setCurrentBoard(boardId);
  await loadCurrentBoard();
  
  // 4. Cập nhật tiêu đề
  updateTitle();
}

async function saveCurrentBoard() {
  const json = await serialize(state.objects);
  await save(state.currentBoardId, json);
  
  // Xóa bản nháp trên Local vì Server đã đồng bộ
  localStorage.removeItem(`jab-hot-exit-${state.currentBoardId}`);
  state.hasUnsavedChanges = false;
  state.needsLocalBackup = false;
}

// --- PHÍM TẮT ---
window.addEventListener('keydown', (e) => {
  const isEditing = document.activeElement?.contentEditable === 'true';

  // Ctrl+Z: Undo
  if (e.ctrlKey && e.key === 'z' && !e.shiftKey && !isEditing) {
    e.preventDefault();
    commandManager.undo();
  }

  // Ctrl+Y: Redo
  if (e.ctrlKey && e.key === 'y' && !isEditing) {
    e.preventDefault();
    commandManager.redo();
  }

  // Ctrl+S: Save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    handleSave();
  }


  // Tool shortcuts (chỉ khi không đang gõ)
  if (!isEditing && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    if (e.key === 'v') toolbar.resetTool();
    if (e.key === 'n') { state.activeTool = 'note'; toolbar.resetTool(); state.activeTool = 'note'; document.getElementById('viewport').classList.add('mode-create'); }
    if (e.key === 's') { state.activeTool = 'shape'; document.getElementById('viewport').classList.add('mode-create'); }
  }
});

async function handleSave() {
  try {
    await saveCurrentBoard();
    document.title = '✓ Đã lưu!';
    
    // Lưu lại ID hiện tại để đề phòng user đổi tab quá nhanh
    const savedId = state.currentBoardId;

    setTimeout(async () => {
      // Chỉ update lại tên cũ nếu chưa switch sang tab khác
      if (state.currentBoardId !== savedId) return;
      updateTitle();
    }, 2000);
  } catch (err) {
    console.error('Lỗi khi lưu:', err);
    document.title = '✗ Lưu thất bại!';
    setTimeout(() => (document.title = 'Just a board'), 2000);
  }
}
