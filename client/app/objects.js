import { state } from './state.js';
import { CreateNoteCmd } from './commands/CreateNoteCmd.js';
import { CreateImageCmd } from './commands/CreateImageCmd.js';
import { CreateShapeCmd } from './commands/CreateShapeCmd.js';

let _commandManager = null;
let _onToolUsed = null;
let _lastMouseDown = null;

/**
 * Khởi tạo sự kiện tạo ghi chú, shapes và dán ảnh.
 * @param onToolUsed - Callback gọi sau khi tool tạo widget xong (reset tool)
 */
export function initObjectEvents(viewport, world, commandManager, onToolUsed) {
  _commandManager = commandManager;
  _onToolUsed = onToolUsed;

  // Theo dõi vị trí mousedown để phân biệt click vs drag
  viewport.addEventListener('mousedown', (e) => {
    _lastMouseDown = { x: e.clientX, y: e.clientY };
  });

  // Click: tạo widget khi đang ở chế độ tool (Note/Shape)
  viewport.addEventListener('click', (e) => {
    if (state.activeTool === 'select') return;
    if (e.target !== viewport && e.target !== world) return;

    // Bỏ qua nếu đây là kết thúc của một cú kéo (drag)
    if (_lastMouseDown) {
      const dx = Math.abs(e.clientX - _lastMouseDown.x);
      const dy = Math.abs(e.clientY - _lastMouseDown.y);
      if (dx > 5 || dy > 5) return;
    }

    const x = (e.clientX - state.targetX) / state.targetScale;
    const y = (e.clientY - state.targetY) / state.targetScale;

    if (state.activeTool === 'note') {
      _commandManager.execute(new CreateNoteCmd(world, x, y));
    } else if (state.activeTool === 'shape') {
      _commandManager.execute(new CreateShapeCmd(world, x, y));
    }

    // Tự động quay về Select mode
    if (_onToolUsed) _onToolUsed();
  });

  // Double click: luôn tạo Note (bất kể tool mode)
  viewport.addEventListener('dblclick', (e) => {
    if (e.target !== viewport && e.target !== world) return;

    const x = (e.clientX - state.targetX) / state.targetScale;
    const y = (e.clientY - state.targetY) / state.targetScale;

    if (e.shiftKey) {
      _commandManager.execute(new CreateShapeCmd(world, x, y));
    } else {
      _commandManager.execute(new CreateNoteCmd(world, x, y));
    }

    // Reset tool nếu đang ở chế độ tool
    if (state.activeTool !== 'select' && _onToolUsed) _onToolUsed();
  });

  // Dán hình ảnh từ clipboard
  window.addEventListener('paste', (e) => {
    const items = e.clipboardData.items;
    for (let item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        const url = URL.createObjectURL(blob);

        const x = (window.innerWidth / 2 - state.targetX) / state.targetScale;
        const y = (window.innerHeight / 2 - state.targetY) / state.targetScale;

        _commandManager.execute(new CreateImageCmd(world, url, x, y));
      }
    }
  });
}
