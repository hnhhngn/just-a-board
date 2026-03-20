import { state } from "../state.js";

const ICONS = {
  select: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>`,
  note: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8M16 17H8M10 9H8"/></svg>`,
  shape: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`,
  save: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>`,
  menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
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
