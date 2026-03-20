import { state } from './state.js';
import { initEngine } from './engine.js';
import { initViewport } from './viewport.js';
import { initObjectEvents } from './objects.js';
import { clearGrid } from './grid.js';
import { CommandManager } from './commands/CommandManager.js';
import { serialize, deserialize } from './storage/BoardSerializer.js';
import { getBoardIndex, createBoard, deleteBoard, saveBoardData, loadBoardData, migrateIfNeeded } from './storage/LocalAdapter.js';
import { initFloatingToolbar } from './hud/FloatingToolbar.js';
import { initSidebar } from './hud/Sidebar.js';

// --- LẤY THAM CHIẾU DOM ---
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');

// --- KHỞI TẠO CORE ---
const commandManager = new CommandManager();
initEngine(world);

// --- KHỞI TẠO HUD ---
const toolbar = initFloatingToolbar({ onSave: handleSave });

initViewport(viewport, world, commandManager);
initObjectEvents(viewport, world, commandManager, () => toolbar.resetTool());

const sidebar = initSidebar({
  getBoardIndex,
  currentBoardId: state.currentBoardId,
  menuIcon: toolbar.menuIcon,
  onBoardSelect: (id) => switchBoard(id),
  onBoardCreate: () => {
    const board = createBoard();
    switchBoard(board.id);
  },
  onBoardDelete: (id) => {
    deleteBoard(id);
    // Nếu xóa board đang mở → chuyển sang board đầu tiên
    if (id === state.currentBoardId) {
      const boards = getBoardIndex();
      if (boards.length > 0) switchBoard(boards[0].id);
    }
  },
});

// --- KHỞI TẠO DỮ LIỆU ---
initializeData();

function initializeData() {
  // Di chuyển dữ liệu cũ nếu có
  const migratedId = migrateIfNeeded();

  const boards = getBoardIndex();
  if (boards.length === 0) {
    // Lần đầu mở ứng dụng: tạo board mặc định
    const board = createBoard('Board mặc định');
    state.currentBoardId = board.id;
  } else if (migratedId) {
    state.currentBoardId = migratedId;
  } else {
    state.currentBoardId = boards[0].id;
  }

  sidebar.setCurrentBoard(state.currentBoardId);
  loadCurrentBoard();
}

// --- QUẢN LÝ BOARD ---

function loadCurrentBoard() {
  const data = loadBoardData(state.currentBoardId);
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
  sidebar.setCurrentBoard(boardId);
  loadCurrentBoard();

  // 4. Cập nhật tiêu đề
  const boards = getBoardIndex();
  const board = boards.find((b) => b.id === boardId);
  document.title = board ? board.name : 'Just a board';
}

async function saveCurrentBoard() {
  const json = await serialize(state.objects);
  saveBoardData(state.currentBoardId, json);
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
  if (!isEditing && !e.ctrlKey && !e.altKey) {
    if (e.key === 'v') toolbar.resetTool();
    if (e.key === 'n') { state.activeTool = 'note'; toolbar.resetTool(); state.activeTool = 'note'; document.getElementById('viewport').classList.add('mode-create'); }
    if (e.key === 's') { state.activeTool = 'shape'; document.getElementById('viewport').classList.add('mode-create'); }
  }
});

async function handleSave() {
  try {
    await saveCurrentBoard();
    document.title = '✓ Đã lưu!';
    setTimeout(() => {
      const boards = getBoardIndex();
      const board = boards.find((b) => b.id === state.currentBoardId);
      document.title = board ? board.name : 'Just a board';
    }, 2000);
  } catch (err) {
    console.error('Lỗi khi lưu:', err);
    document.title = '✗ Lưu thất bại!';
    setTimeout(() => (document.title = 'Just a board'), 2000);
  }
}
