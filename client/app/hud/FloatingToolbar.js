import { state } from "../state.js";

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
      <button class="tool-btn tool-status-btn" data-status="pan" type="button" aria-label="Pan" tabindex="-1">
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

  const panel = container.querySelector("#toolbarPanel");
  const toolBtns = container.querySelectorAll("[data-tool]");
  const panStatusBtn = container.querySelector('[data-status="pan"]');
  const viewport = document.getElementById("viewport");

  // Tool selection
  toolBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setTool(btn.dataset.tool);
    });
  });

  function syncToolUi() {
    const isPanMode = state.isSpacePressed || state.isPanning;

    toolBtns.forEach((b) => {
      b.classList.toggle("active", b.dataset.tool === state.activeTool);
    });

    if (panStatusBtn) {
      panStatusBtn.classList.toggle("active", isPanMode);
      panStatusBtn.classList.toggle("is-dragging", state.isPanning);
    }

    if (viewport) {
      viewport.dataset.tool = state.activeTool;
      if (state.isPanning) {
        viewport.dataset.interaction = "pan-active";
      } else if (isPanMode) {
        viewport.dataset.interaction = "pan";
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
