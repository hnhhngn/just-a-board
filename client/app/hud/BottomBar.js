import { state, settings } from '../state.js';
import { wakeUp } from '../engine.js';

const SETTINGS_KEY = 'jab-settings';

const ICONS = {
  gear: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-settings"></use></svg>`,
  sun: `<svg width="16" height="16"><use href="assets/icons/sprite.svg#icon-theme"></use></svg>`,
  unsaved: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-save"></use></svg>`,
  saved: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-check"></use></svg>`,
};

// --- Helpers: localStorage cho settings ---
function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (typeof saved.useLerp === 'boolean') settings.useLerp = saved.useLerp;
      if (typeof saved.pansEase === 'number')  settings.pansEase = saved.pansEase;
      if (typeof saved.zoomEase === 'number')  settings.zoomEase = saved.zoomEase;
      if (typeof saved.showGrid === 'boolean') settings.showGrid = saved.showGrid;
    }
  } catch { /* ignore */ }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    useLerp: settings.useLerp,
    pansEase: settings.pansEase,
    zoomEase: settings.zoomEase,
    showGrid: settings.showGrid,
  }));
}

/**
 * Khởi tạo Bottom Bar (Zoom + Settings).
 */
export function initBottomBar({ onSave } = {}) {
  // Load settings trước khi dựng UI
  loadSettings();

  const world = document.getElementById('world');
  if (!settings.showGrid) world.classList.add('hide-grid');

  // Load saved theme
  const savedTheme = localStorage.getItem('jab-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // --- Dựng DOM ---
  const container = document.createElement('div');
  container.className = 'bottom-controls';
  container.innerHTML = `
    <button class="bottom-btn icon-only" id="saveIndicatorBtn" title="Đã lưu toàn bộ">
      ${ICONS.saved}
    </button>
    <div style="position: relative;">
      <button class="bottom-btn" id="zoomToggle">100%</button>
      <div class="zoom-dropdown" id="zoomMenu">
        <div class="zoom-item" data-action="zoomIn"><span>Zoom In</span></div>
        <div class="zoom-item" data-action="zoomOut"><span>Zoom Out</span></div>
        <div class="zoom-item" data-action="zoom100"><span>Zoom to 100%</span></div>
        <div class="zoom-item" data-action="zoomFit"><span>Zoom to Fit</span></div>
      </div>
    </div>
    <div style="position: relative;">
      <button class="bottom-btn icon-only" id="settingsToggle" title="Cài đặt">${ICONS.gear}</button>
      <div class="settings-dropdown" id="settingsMenu">
        <div class="settings-header">Cài đặt</div>

        <div class="settings-row">
          <label>Giao diện</label>
          <button class="bottom-btn icon-only" id="settingsThemeBtn" title="Dark / Light" style="width:28px;height:28px">
            ${ICONS.sun}
          </button>
        </div>

        <div class="settings-row">
          <label for="settingsGrid">Hiện lưới</label>
          <label class="settings-toggle">
            <input type="checkbox" id="settingsGrid" ${settings.showGrid ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-row">
          <label for="settingsLerp">Làm mượt (Lerp)</label>
          <label class="settings-toggle">
            <input type="checkbox" id="settingsLerp" ${settings.useLerp ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="settings-control-group ${settings.useLerp ? '' : 'disabled'}" id="easeControls">
          <div class="settings-control-header">
            <span>Tốc độ Pan</span>
            <span id="pansVal">${settings.pansEase.toFixed(2)}</span>
          </div>
          <input type="range" class="settings-slider" id="pansSlider" min="0.05" max="0.5" step="0.01" value="${settings.pansEase}">

          <div class="settings-control-header" style="margin-top:8px">
            <span>Tốc độ Zoom</span>
            <span id="zoomVal">${settings.zoomEase.toFixed(2)}</span>
          </div>
          <input type="range" class="settings-slider" id="zoomSlider" min="0.05" max="0.5" step="0.01" value="${settings.zoomEase}">
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  // ========== SAVE STATUS ==========
  const saveBtn = container.querySelector('#saveIndicatorBtn');
  saveBtn.addEventListener('click', () => {
    if (onSave) onSave();
  });

  // ========== ZOOM ==========
  const zoomBtn = container.querySelector('#zoomToggle');
  const zoomMenu = container.querySelector('#zoomMenu');

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

  function updateZoomText() {
    zoomBtn.textContent = Math.round(state.targetScale * 100) + '%';
  }

  let lastScale = -1;
  function loop() {
    if (Math.abs(state.targetScale - lastScale) > 0.01) {
      updateZoomText();
      lastScale = state.targetScale;
    }
    requestAnimationFrame(loop);
  }
  loop();

  // ========== SETTINGS ==========
  const settingsBtn = container.querySelector('#settingsToggle');
  const settingsMenu = container.querySelector('#settingsMenu');
  const themeBtn = container.querySelector('#settingsThemeBtn');
  const gridToggle = container.querySelector('#settingsGrid');
  const lerpToggle = container.querySelector('#settingsLerp');
  const easeGroup = container.querySelector('#easeControls');
  const pansSlider = container.querySelector('#pansSlider');
  const zoomSlider = container.querySelector('#zoomSlider');
  const pansVal = container.querySelector('#pansVal');
  const zoomVal = container.querySelector('#zoomVal');

  // Theme
  themeBtn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('jab-theme', next);
  });

  // Grid
  gridToggle.addEventListener('change', () => {
    settings.showGrid = gridToggle.checked;
    world.classList.toggle('hide-grid', !settings.showGrid);
    saveSettings();
  });

  // Lerp
  lerpToggle.addEventListener('change', () => {
    settings.useLerp = lerpToggle.checked;
    easeGroup.classList.toggle('disabled', !settings.useLerp);
    saveSettings();
  });

  // Sliders
  pansSlider.addEventListener('input', () => {
    settings.pansEase = parseFloat(pansSlider.value);
    pansVal.textContent = settings.pansEase.toFixed(2);
    saveSettings();
  });

  zoomSlider.addEventListener('input', () => {
    settings.zoomEase = parseFloat(zoomSlider.value);
    zoomVal.textContent = settings.zoomEase.toFixed(2);
    saveSettings();
  });

  // Toggle settings popup
  let settingsOpen = false;
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsOpen = !settingsOpen;
    settingsMenu.classList.toggle('open', settingsOpen);
  });

  document.addEventListener('click', (e) => {
    if (settingsOpen && !settingsMenu.contains(e.target) && e.target !== settingsBtn) {
      settingsOpen = false;
      settingsMenu.classList.remove('open');
    }
  });

  // Ngăn sự kiện chuột lan truyền ra viewport
  settingsMenu.addEventListener('mousedown', (e) => e.stopPropagation());
  settingsMenu.addEventListener('pointerdown', (e) => e.stopPropagation());
  settingsMenu.addEventListener('click', (e) => e.stopPropagation());

  return { 
    updateZoomText,
    setDirtyIndicator(isDirty) {
      if (isDirty) {
        saveBtn.innerHTML = ICONS.unsaved;
        saveBtn.title = "Nội dung thay đổi (Ctrl+S)";
        saveBtn.style.opacity = '1';
        saveBtn.style.color = '';
      } else {
        saveBtn.innerHTML = ICONS.saved;
        saveBtn.title = "Đã lưu bản vẽ";
        saveBtn.style.opacity = '0.8';
        saveBtn.style.color = 'var(--color-accent)';
      }
    }
  };
}
