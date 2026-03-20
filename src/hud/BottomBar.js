import { state } from '../state.js';
import { wakeUp } from '../engine.js';

const ICONS = {
  theme: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  cloud: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-4.71c.21.01.42.02.63.02a4.5 4.5 0 0 1 1.16 8.69Z"/></svg>`,
  help: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
};

export function initBottomBar(containerId) {
  const container = document.createElement('div');
  container.className = 'bottom-controls';
  container.innerHTML = `
    <div style="position: relative;">
      <button class="bottom-btn" id="zoomToggle">100%</button>
      <div class="zoom-dropdown" id="zoomMenu">
        <div class="zoom-item" data-action="zoomIn">
          <span>Zoom In</span>
        </div>
        <div class="zoom-item" data-action="zoomOut">
          <span>Zoom Out</span>
        </div>
        <div class="zoom-item" data-action="zoom100">
          <span>Zoom to 100%</span>
        </div>
        <div class="zoom-item" data-action="zoomFit">
          <span>Zoom to Fit</span>
        </div>
      </div>
    </div>
    <button class="bottom-btn icon-only" id="themeToggle" title="Đổi giao diện Dark/Light">${ICONS.theme}</button>
  `;

  document.body.appendChild(container);

  const zoomBtn = container.querySelector('#zoomToggle');
  const zoomMenu = container.querySelector('#zoomMenu');
  const themeToggle = container.querySelector('#themeToggle');

  // Load saved theme
  const savedTheme = localStorage.getItem('jab-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Theme Toggle
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const target = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', target);
    localStorage.setItem('jab-theme', target);
  });

  // Zoom dropdown interaction
  let zoomOpen = false;
  zoomBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    zoomOpen = !zoomOpen;
    zoomMenu.classList.toggle('open', zoomOpen);
  });

  document.addEventListener('click', (e) => {
    if (zoomOpen && !zoomMenu.contains(e.target) && e.target !== zoomBtn) {
      zoomOpen = false;
      zoomMenu.classList.remove('open');
    }
  });

  // Zoom actions
  function handleZoomFromCenter(newScale) {
    state.anchorMouseX = window.innerWidth / 2;
    state.anchorMouseY = window.innerHeight / 2;
    state.anchorWorldX = (state.anchorMouseX - state.currentX) / state.currentScale;
    state.anchorWorldY = (state.anchorMouseY - state.currentY) / state.currentScale;
    state.targetScale = newScale;
    state.isZooming = true;
    wakeUp();
  }

  zoomMenu.querySelectorAll('.zoom-item').forEach(item => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      if (action === 'zoomIn') {
        handleZoomFromCenter(Math.min(state.targetScale * 1.25, 5));
      } else if (action === 'zoomOut') {
        handleZoomFromCenter(Math.max(state.targetScale / 1.25, 0.1));
      } else if (action === 'zoom100') {
        handleZoomFromCenter(1);
      } else if (action === 'zoomFit') {
        state.targetScale = 1;
        state.targetX = 0;
        state.targetY = 0;
        wakeUp();
      }
      zoomOpen = false;
      zoomMenu.classList.remove('open');
      updateZoomText();
    });
  });

  // Xử lý lắng nghe sự kiện để cập nhật số Zoom Text
  function updateZoomText() {
    zoomBtn.textContent = Math.round(state.targetScale * 100) + '%';
  }

  // Khởi động vòng lặp kiểm tra sự thay đổi zoom để update UI (hoặc dispatch event ở engine)
  // Vì zoom scale thường xuyên được update smooth trong engine, ta sẽ loop để render mượt
  let lastScale = -1;
  function loop() {
    if (Math.abs(state.targetScale - lastScale) > 0.01) {
      updateZoomText();
      lastScale = state.targetScale;
    }
    requestAnimationFrame(loop);
  }
  loop();

  return { updateZoomText };
}
