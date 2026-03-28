import { getEffectiveTool, state } from "../../core/state.js";

const ICONS = {
  select: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-pointer"></use></svg>`,
  pan: `<svg width="18" height="18" viewBox="0 0 256 256"><use href="assets/icons/sprite.svg#icon-pan"></use></svg>`,
  note: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-note"></use></svg>`,
  shape: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-shape"></use></svg>`,
  menu: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-menu"></use></svg>`,
};

/**
 * Khoi tao Floating Toolbar (Toolbar luon hien dang Pill).
 */
export function initFloatingToolbar({ onSave }) {
  const container = document.createElement("div");
  container.className = "toolbar-container";
  container.innerHTML = `
    <div class="toolbar-panel" id="toolbarPanel">
      <button class="tool-btn" data-tool="pan" type="button" aria-label="Pan" data-tooltip="Pan" data-tooltip-shortcut="Space" data-tooltip-placement="left">
        ${ICONS.pan}
      </button>
      <button class="tool-btn active" data-tool="select" type="button" aria-label="Chọn" data-tooltip="Chọn" data-tooltip-shortcut="V" data-tooltip-placement="left">
        ${ICONS.select}
      </button>
      <button class="tool-btn" data-tool="note" type="button" aria-label="Ghi chú" data-tooltip="Ghi chú" data-tooltip-shortcut="N" data-tooltip-placement="left">
        ${ICONS.note}
      </button>
      <button class="tool-btn" data-tool="shape" type="button" aria-label="Hình khối" data-tooltip="Hình khối" data-tooltip-shortcut="S" data-tooltip-placement="left">
        ${ICONS.shape}
      </button>
    </div>
  `;

  document.body.appendChild(container);

  const toolBtns = container.querySelectorAll("[data-tool]");
  const panBtn = container.querySelector('[data-tool="pan"]');
  const viewport = document.getElementById("viewport");

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
