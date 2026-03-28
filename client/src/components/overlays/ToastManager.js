const DEFAULT_DURATIONS = {
  success: 3500,
  info: 3500,
  warning: 5000,
  error: 5000,
};

let toastStack = null;

function ensureToastStack() {
  if (toastStack) return toastStack;

  toastStack = document.createElement("div");
  toastStack.className = "feedback-toast-stack";
  toastStack.setAttribute("aria-live", "polite");
  toastStack.setAttribute("aria-atomic", "false");
  document.body.appendChild(toastStack);

  return toastStack;
}

function createButton(label, className) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  return button;
}

export function initNotificationsHost() {
  return ensureToastStack();
}

export function notify({
  tone = "info",
  title = "",
  message,
  durationMs,
  actionLabel = "",
  onAction = null,
} = {}) {
  if (!message) return null;

  const stack = ensureToastStack();
  const toast = document.createElement("section");
  toast.className = `feedback-toast tone-${tone}`;
  toast.tabIndex = 0;
  toast.setAttribute("role", tone === "error" || tone === "warning" ? "alert" : "status");

  const body = document.createElement("div");
  body.className = "feedback-toast-body";

  if (title) {
    const titleEl = document.createElement("div");
    titleEl.className = "feedback-toast-title";
    titleEl.textContent = title;
    body.appendChild(titleEl);
  }

  const messageEl = document.createElement("div");
  messageEl.className = "feedback-toast-message";
  messageEl.textContent = message;
  body.appendChild(messageEl);
  toast.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "feedback-toast-actions";

  if (actionLabel && typeof onAction === "function") {
    const actionButton = createButton(actionLabel, "feedback-toast-action");
    actionButton.addEventListener("click", () => {
      onAction();
      dismiss();
    });
    actions.appendChild(actionButton);
  }

  const closeButton = createButton("Close", "feedback-toast-close");
  closeButton.setAttribute("aria-label", "Dismiss notification");
  closeButton.textContent = "×";
  closeButton.addEventListener("click", dismiss);
  actions.appendChild(closeButton);

  toast.appendChild(actions);
  stack.prepend(toast);

  const timeoutMs = durationMs ?? DEFAULT_DURATIONS[tone] ?? DEFAULT_DURATIONS.info;
  let remaining = timeoutMs;
  let startedAt = 0;
  let timerId = null;
  let dismissed = false;

  function clearTimer() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    clearTimer();
    startedAt = Date.now();
    timerId = window.setTimeout(dismiss, remaining);
  }

  function pauseTimer() {
    if (!timerId) return;
    remaining -= Date.now() - startedAt;
    clearTimer();
  }

  function resumeTimer() {
    if (dismissed) return;
    remaining = Math.max(200, remaining);
    startTimer();
  }

  function teardown() {
    clearTimer();
    toast.remove();
  }

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    clearTimer();
    toast.classList.remove("is-open");
    window.setTimeout(teardown, 180);
  }

  toast.addEventListener("mouseenter", pauseTimer);
  toast.addEventListener("mouseleave", resumeTimer);
  toast.addEventListener("focusin", pauseTimer);
  toast.addEventListener("focusout", (event) => {
    if (toast.contains(event.relatedTarget)) return;
    resumeTimer();
  });

  requestAnimationFrame(() => {
    toast.classList.add("is-open");
  });

  startTimer();

  return { dismiss };
}
