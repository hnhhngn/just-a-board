import { state } from '../state.js';

const ICONS = {
  layers: `<svg width="16" height="16"><use href="assets/icons/sprite.svg#icon-layers"></use></svg>`,
  chevron: `<svg width="14" height="14"><use href="assets/icons/sprite.svg#icon-chevron"></use></svg>`,
  note: `<svg width="14" height="14"><use href="assets/icons/sprite.svg#icon-note"></use></svg>`,
  shape: `<svg width="14" height="14"><use href="assets/icons/sprite.svg#icon-shape"></use></svg>`,
  image: `<svg width="14" height="14"><use href="assets/icons/sprite.svg#icon-image"></use></svg>`,
};

const TYPE_LABELS = {
  note: 'Note',
  shape: 'Shape',
  image: 'Image',
};

/**
 * Khởi tạo Object List HUD — pill collapsible ở góc dưới trái.
 * Hiển thị danh sách các object trên board hiện tại.
 */
export function initObjectList() {
  // --- Dựng DOM ---
  const container = document.createElement('div');
  container.className = 'objlist';
  container.innerHTML = `
    <div class="objlist-panel" id="objlistPanel">
      <div class="objlist-items" id="objlistItems"></div>
    </div>
    <button class="objlist-trigger" id="objlistTrigger">
      <span class="objlist-trigger-icon">${ICONS.layers}</span>
      <span class="objlist-trigger-label">Objects</span>
      <span class="objlist-trigger-count" id="objlistCount">0</span>
      <span class="objlist-trigger-chevron">${ICONS.chevron}</span>
    </button>
  `;
  document.body.appendChild(container);

  const trigger = container.querySelector('#objlistTrigger');
  const panel = container.querySelector('#objlistPanel');
  const itemsEl = container.querySelector('#objlistItems');
  const countEl = container.querySelector('#objlistCount');

  // --- Toggle open/close ---
  let isOpen = false;

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen = !isOpen;
    container.classList.toggle('open', isOpen);
    if (isOpen) refresh();
  });

  document.addEventListener('click', (e) => {
    if (isOpen && !container.contains(e.target)) {
      isOpen = false;
      container.classList.remove('open');
    }
  });

  // Ngăn sự kiện lan ra viewport
  panel.addEventListener('mousedown', (e) => e.stopPropagation());
  panel.addEventListener('pointerdown', (e) => e.stopPropagation());
  panel.addEventListener('click', (e) => e.stopPropagation());

  // --- Render danh sách ---
  function refresh() {
    const objects = state.objects;
    countEl.textContent = objects.length;

    if (objects.length === 0) {
      itemsEl.innerHTML = `<div class="objlist-empty">Chưa có object nào</div>`;
      return;
    }

    itemsEl.innerHTML = objects.map((obj, i) => {
      const icon = ICONS[obj.type] || ICONS.shape;
      const label = getLabel(obj, i);
      return `<div class="objlist-item" data-index="${i}">
        <span class="objlist-item-icon">${icon}</span>
        <span class="objlist-item-label">${label}</span>
      </div>`;
    }).join('');

    // Click vào item → scroll/focus object trên board
    itemsEl.querySelectorAll('.objlist-item').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.index);
        const obj = state.objects[idx];
        if (obj && obj.element) {
          obj.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          // Highlight tạm
          obj.element.classList.add('widget-highlight');
          setTimeout(() => obj.element.classList.remove('widget-highlight'), 1200);
        }
      });
    });
  }

  function getLabel(obj, index) {
    const prefix = TYPE_LABELS[obj.type] || obj.type;
    // Nếu là note có text → lấy text snippet
    if (obj.type === 'note' && obj.element) {
      const text = obj.element.textContent?.trim();
      if (text) return escapeHtml(text.substring(0, 30)) + (text.length > 30 ? '…' : '');
    }
    return `${prefix} ${index + 1}`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Tự động cập nhật count qua polling nhẹ ---
  let lastCount = -1;
  let lastVersion = -1;
  function loop() {
    const count = state.objects.length;
    const version = state.objectsVersion;
    if (count !== lastCount || version !== lastVersion) {
      countEl.textContent = count;
      lastCount = count;
       lastVersion = version;
      if (isOpen) refresh();
    }
    requestAnimationFrame(loop);
  }
  loop();

  return { refresh };
}
