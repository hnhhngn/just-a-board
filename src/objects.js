import { state } from './state.js';
import { CreateNoteCmd } from './commands/CreateNoteCmd.js';
import { CreateImageCmd } from './commands/CreateImageCmd.js';

/**
 * Khởi tạo sự kiện tạo ghi chú (dblclick) và dán ảnh (paste).
 */
export function initObjectEvents(viewport, world, commandManager) {
  // Double click để tạo ghi chú
  viewport.addEventListener('dblclick', (e) => {
    if (e.target !== viewport && e.target !== world) return;

    const x = (e.clientX - state.targetX) / state.targetScale;
    const y = (e.clientY - state.targetY) / state.targetScale;

    commandManager.execute(new CreateNoteCmd(world, x, y));
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

        commandManager.execute(new CreateImageCmd(world, url, x, y));
      }
    }
  });
}
