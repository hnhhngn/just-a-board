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
    // Nếu xóa board đang mở → chuyển sang board đầu tiên
    if (id === state.currentBoardId) {
      const boards = await getIndex();
      if (boards.length > 0) await switchBoard(boards[0].id);
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
}

// --- QUẢN LÝ BOARD ---

async function loadCurrentBoard() {
  const data = await load(state.currentBoardId);
  if (data) {
    deserialize(data, world);
  }
}

function clearCurrentBoard() {
  // Gỡ tất cả widget khỏi DOM
  state.objects.forEach((obj) => obj.detach());
  state.objects.length = 0;
  clearGrid();
  commandManager.clear();
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
  const boards = await getIndex();
  const board = boards.find((b) => b.id === boardId);
  document.title = board ? board.name : 'Just a board';
}

async function saveCurrentBoard() {
  const json = await serialize(state.objects);
  await save(state.currentBoardId, json);
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

      const boards = await getIndex();
      const board = boards.find((b) => b.id === savedId);
      document.title = board ? board.name : 'Just a board';
    }, 2000);
  } catch (err) {
    console.error('Lỗi khi lưu:', err);
    document.title = '✗ Lưu thất bại!';
    setTimeout(() => (document.title = 'Just a board'), 2000);
  }
}
