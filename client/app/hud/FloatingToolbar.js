import { state } from "../state.js";

const ICONS = {
  select: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-pointer"></use></svg>`,
  note: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-note"></use></svg>`,
  shape: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-shape"></use></svg>`,
  save: `<svg width="18" height="18"><use href="assets/icons/sprite.svg#icon-save"></use></svg>`,
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
      <div class="toolbar-divider"></div>
      <button class="tool-btn" data-action="save">
        ${ICONS.save}
        <div class="tool-tooltip">Lưu <span>Ctrl+S</span></div>
      </button>
    </div>
  `;

  document.body.appendChild(container);

  const panel = container.querySelector("#toolbarPanel");
  const toolBtns = container.querySelectorAll("[data-tool]");

  // Tool selection
  toolBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setTool(btn.dataset.tool);
    });
  });

  // Save button
  container
    .querySelector('[data-action="save"]')
    .addEventListener("click", (e) => {
      e.stopPropagation();
      onSave();
    });

  function setTool(tool) {
    state.activeTool = tool;
    toolBtns.forEach((b) => b.classList.remove("active"));
    const active = container.querySelector(`[data-tool="${tool}"]`);
    if (active) active.classList.add("active");
    updateCursor();
  }

  function updateCursor() {
    const vp = document.getElementById("viewport");
    vp.classList.toggle("mode-create", state.activeTool !== "select");
  }

  return {
    resetTool() {
      setTool("select");
    },
    menuIcon: ICONS.menu,
  };
}
