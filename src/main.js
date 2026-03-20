import { state } from './state.js';
import { initEngine } from './engine.js';
import { initViewport } from './viewport.js';
import { initObjectEvents } from './objects.js';
import { CommandManager } from './commands/CommandManager.js';
import { serialize, deserialize } from './storage/BoardSerializer.js';
import { saveBoard, loadBoard } from './storage/LocalAdapter.js';

// --- LẤY THAM CHIẾU DOM ---
const viewport = document.getElementById('viewport');
const world = document.getElementById('world');

// --- KHỞI TẠO ---
const commandManager = new CommandManager();
initEngine(world);
initViewport(viewport, world, commandManager);
initObjectEvents(viewport, world, commandManager);

// --- LOAD: Khôi phục Board từ localStorage ---
const savedData = loadBoard();
if (savedData) {
  deserialize(savedData, world);
}

// --- PHÍM TẮT ---
window.addEventListener('keydown', (e) => {
  // Bỏ qua nếu đang gõ trong Note (contentEditable)
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
});

async function handleSave() {
  try {
    const json = await serialize(state.objects);
    saveBoard(json);
    // Phản hồi nhanh qua tiêu đề trang
    document.title = '✓ Đã lưu!';
    setTimeout(() => (document.title = 'Just a board'), 2000);
  } catch (err) {
    console.error('Lỗi khi lưu:', err);
    document.title = '✗ Lưu thất bại!';
    setTimeout(() => (document.title = 'Just a board'), 2000);
  }
}
