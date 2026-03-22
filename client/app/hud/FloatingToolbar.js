import { getEffectiveTool, state } from "../state.js";

const ICONS = {
  select: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-pointer"></use></svg>`,
  pan: `<svg width="18" height="18" viewBox="0 0 256 256"><use href="assets/icons/sprite.svg#icon-pan"></use></svg>`,
  note: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-note"></use></svg>`,
  shape: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-shape"></use></svg>`,
  menu: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-menu"></use></svg>`,
};

/**
 * Khởi tạo Floating Toolbar (Toolbar luôn hiện dạng Pill).
 */
export function initFloatingToolbar({ onSave }) {
  const container = document.createElement("div");
  container.className = "toolbar-container";
  container.innerHTML = `
    <div class="toolbar-panel" id="toolbarPanel">
      <button class="tool-btn" data-tool="pan" type="button" aria-label="Pan">
        ${ICONS.pan}
        <div class="tool-tooltip">Pan <span>Space</span></div>
      </button>
      <button class="tool-btn active" data-tool="select">
        ${ICONS.select}
        <div class="tool-tooltip">Chọn <span>V</span></div>
      </button>
      <button class="tool-btn" data-tool="note">
        ${ICONS.note}
        <div class="tool-tooltip">Ghi chú <span>N</span></div>
      </button>
      <button class="tool-btn" data-tool="shape">
        ${ICONS.shape}
        <div class="tool-tooltip">Hình khối <span>S</span></div>
      </button>
    </div>
  `;

  document.body.appendChild(container);

  const toolBtns = container.querySelectorAll("[data-tool]");
  const panBtn = container.querySelector('[data-tool="pan"]');
  const viewport = document.getElementById("viewport");

  // Tool selection
  toolBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setTool(btn.dataset.tool);
    });
  });

  function syncToolUi() {
    const effectiveTool = getEffectiveTool();

    toolBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.tool === effectiveTool);
    });

    if (panBtn) {
      panBtn.classList.toggle("is-dragging", state.isPanning);
    }

    if (viewport) {
      viewport.dataset.tool = effectiveTool;
      if (state.isPanning) {
        viewport.dataset.interaction = "pan-active";
      } else {
        delete viewport.dataset.interaction;
      }
    }
  }

  function setTool(tool) {
    state.activeTool = tool;
    syncToolUi();
  }

  syncToolUi();

  return {
    setTool,
    resetTool() {
      setTool("select");
    },
    refresh() {
      syncToolUi();
    },
    menuIcon: ICONS.menu,
  };
}
