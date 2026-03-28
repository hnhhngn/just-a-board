import { state } from '../../core/state.js';

export function initContextMenu() {
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  document.body.appendChild(menu);

  let activeItems = [];

  function hide() {
    menu.classList.remove('open');
    menu.innerHTML = '';
    activeItems = [];
    state.contextMenu = null;
  }

  function show({ clientX, clientY, items, kind }) {
    activeItems = items;
    state.contextMenu = { kind, clientX, clientY };
    menu.innerHTML = items.map((item, index) => `
      <button class="context-menu-item${item.disabled ? ' disabled' : ''}" data-index="${index}" ${item.disabled ? 'disabled' : ''}>
        ${item.label}
      </button>
    `).join('');

    menu.classList.add('open');
    const rect = menu.getBoundingClientRect();
    const left = Math.min(clientX, window.innerWidth - rect.width - 12);
    const top = Math.min(clientY, window.innerHeight - rect.height - 12);
    menu.style.left = `${Math.max(12, left)}px`;
    menu.style.top = `${Math.max(12, top)}px`;
  }

  menu.addEventListener('click', (event) => {
    const button = event.target.closest('.context-menu-item');
    if (!button) return;
    const item = activeItems[Number(button.dataset.index)];
    hide();
    if (item?.onSelect) item.onSelect();
  });

  document.addEventListener('mousedown', (event) => {
    if (!menu.classList.contains('open')) return;
    if (!menu.contains(event.target)) hide();
  });

  window.addEventListener('blur', hide);
  window.addEventListener('resize', hide);

  return {
    show,
    hide,
  };
}
