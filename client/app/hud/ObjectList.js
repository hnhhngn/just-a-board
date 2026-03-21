import { state } from '../state.js';

const ICONS = {
  layers: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
  chevron: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
  note: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
  shape: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>`,
  image: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
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
  function loop() {
    const count = state.objects.length;
    if (count !== lastCount) {
      countEl.textContent = count;
      lastCount = count;
      if (isOpen) refresh();
    }
    requestAnimationFrame(loop);
  }
  loop();

  return { refresh };
}
