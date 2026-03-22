const TOOLTIP_SELECTOR = "[data-tooltip]";
const TOOLTIP_OFFSET = 12;
const VIEWPORT_PADDING = 10;

const appliedRoots = new WeakSet();

let tooltipHost = null;
let tooltipLabel = null;
let tooltipShortcut = null;
let activeTarget = null;

function ensureTooltipHost() {
  if (tooltipHost) return tooltipHost;

  tooltipHost = document.createElement("div");
  tooltipHost.className = "app-tooltip";
  tooltipHost.setAttribute("role", "tooltip");
  tooltipHost.innerHTML = `
    <span class="app-tooltip-label"></span>
    <span class="app-tooltip-shortcut"></span>
  `;

  tooltipLabel = tooltipHost.querySelector(".app-tooltip-label");
  tooltipShortcut = tooltipHost.querySelector(".app-tooltip-shortcut");
  document.body.appendChild(tooltipHost);

  window.addEventListener("resize", () => {
    if (activeTarget) positionTooltip(activeTarget);
  });

  window.addEventListener("scroll", () => {
    if (activeTarget) positionTooltip(activeTarget);
  }, true);

  return tooltipHost;
}

function getTooltipTarget(node) {
  if (!(node instanceof Element)) return null;
  const target = node.closest(TOOLTIP_SELECTOR);
  if (!target) return null;
  if (target.hasAttribute("disabled") || target.getAttribute("aria-disabled") === "true") {
    return null;
  }
  return target;
}

function getTooltipMeta(target) {
  const label = target.dataset.tooltip?.trim();
  if (!label) return null;
  return {
    label,
    shortcut: target.dataset.tooltipShortcut?.trim() || "",
    placement: target.dataset.tooltipPlacement?.trim() || "top",
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function positionTooltip(target) {
  if (!tooltipHost) return;

  const meta = getTooltipMeta(target);
  if (!meta) {
    hideTooltip();
    return;
  }

  tooltipHost.dataset.placement = meta.placement;
  tooltipLabel.textContent = meta.label;
  tooltipShortcut.textContent = meta.shortcut;
  tooltipShortcut.hidden = !meta.shortcut;

  const rect = target.getBoundingClientRect();
  tooltipHost.classList.add("is-measuring");
  tooltipHost.classList.add("is-open");

  const tooltipRect = tooltipHost.getBoundingClientRect();
  const maxLeft = window.innerWidth - tooltipRect.width - VIEWPORT_PADDING;
  const maxTop = window.innerHeight - tooltipRect.height - VIEWPORT_PADDING;

  let left = rect.left + (rect.width - tooltipRect.width) / 2;
  let top = rect.top - tooltipRect.height - TOOLTIP_OFFSET;

  if (meta.placement === "bottom") {
    top = rect.bottom + TOOLTIP_OFFSET;
  } else if (meta.placement === "left") {
    left = rect.left - tooltipRect.width - TOOLTIP_OFFSET;
    top = rect.top + (rect.height - tooltipRect.height) / 2;
  } else if (meta.placement === "right") {
    left = rect.right + TOOLTIP_OFFSET;
    top = rect.top + (rect.height - tooltipRect.height) / 2;
  }

  tooltipHost.style.left = `${clamp(left, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, maxLeft))}px`;
  tooltipHost.style.top = `${clamp(top, VIEWPORT_PADDING, Math.max(VIEWPORT_PADDING, maxTop))}px`;
  tooltipHost.classList.remove("is-measuring");
}

function showTooltip(target) {
  const meta = getTooltipMeta(target);
  if (!meta) {
    hideTooltip();
    return;
  }

  ensureTooltipHost();
  activeTarget = target;
  positionTooltip(target);
}

function hideTooltip(target = activeTarget) {
  if (!tooltipHost || !target || target !== activeTarget) return;
  activeTarget = null;
  tooltipHost.classList.remove("is-open");
  tooltipHost.classList.remove("is-measuring");
}

function shouldIgnoreRelatedTarget(target, relatedTarget) {
  return relatedTarget instanceof Node && target.contains(relatedTarget);
}

export function applyTooltips(root = document.body) {
  ensureTooltipHost();

  if (appliedRoots.has(root)) return;
  appliedRoots.add(root);

  root.addEventListener("mouseover", (event) => {
    const target = getTooltipTarget(event.target);
    if (!target || shouldIgnoreRelatedTarget(target, event.relatedTarget)) return;
    showTooltip(target);
  });

  root.addEventListener("mouseout", (event) => {
    const target = getTooltipTarget(event.target);
    if (!target || shouldIgnoreRelatedTarget(target, event.relatedTarget)) return;
    hideTooltip(target);
  });

  root.addEventListener("focusin", (event) => {
    const target = getTooltipTarget(event.target);
    if (!target) return;
    showTooltip(target);
  });

  root.addEventListener("focusout", (event) => {
    const target = getTooltipTarget(event.target);
    if (!target || shouldIgnoreRelatedTarget(target, event.relatedTarget)) return;
    hideTooltip(target);
  });

  root.addEventListener("pointerdown", () => hideTooltip());
}

export function setTooltip(target, { label = "", shortcut = "", placement = "top" } = {}) {
  if (!target) return;

  if (label) {
    target.dataset.tooltip = label;
    target.dataset.tooltipPlacement = placement;
    if (shortcut) {
      target.dataset.tooltipShortcut = shortcut;
    } else {
      delete target.dataset.tooltipShortcut;
    }
    target.removeAttribute("title");
  } else {
    delete target.dataset.tooltip;
    delete target.dataset.tooltipShortcut;
    delete target.dataset.tooltipPlacement;
    if (activeTarget === target) hideTooltip(target);
  }

  if (activeTarget === target) {
    showTooltip(target);
  }
}
