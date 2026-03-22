const confirmQueue = [];

let confirmLayer = null;
let confirmDialog = null;
let confirmTitle = null;
let confirmMessage = null;
let confirmCancel = null;
let confirmSubmit = null;
let activeRequest = null;

function ensureConfirmHost() {
  if (confirmLayer) return confirmLayer;

  confirmLayer = document.createElement("div");
  confirmLayer.className = "feedback-confirm-layer";
  confirmLayer.innerHTML = `
    <div class="feedback-confirm-backdrop"></div>
    <section class="feedback-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="feedbackConfirmTitle" aria-describedby="feedbackConfirmMessage">
      <div class="feedback-confirm-content">
        <h2 class="feedback-confirm-title" id="feedbackConfirmTitle"></h2>
        <p class="feedback-confirm-message" id="feedbackConfirmMessage"></p>
      </div>
      <div class="feedback-confirm-actions">
        <button type="button" class="feedback-confirm-btn secondary" data-action="cancel"></button>
        <button type="button" class="feedback-confirm-btn primary" data-action="confirm"></button>
      </div>
    </section>
  `;

  confirmDialog = confirmLayer.querySelector(".feedback-confirm-dialog");
  confirmTitle = confirmLayer.querySelector(".feedback-confirm-title");
  confirmMessage = confirmLayer.querySelector(".feedback-confirm-message");
  confirmCancel = confirmLayer.querySelector('[data-action="cancel"]');
  confirmSubmit = confirmLayer.querySelector('[data-action="confirm"]');

  confirmCancel.addEventListener("click", () => settle(false));
  confirmSubmit.addEventListener("click", () => settle(true));
  confirmLayer.addEventListener("click", (event) => {
    const clickedElement = event.target instanceof Element ? event.target : null;
    if (clickedElement === confirmLayer || clickedElement?.classList.contains("feedback-confirm-backdrop")) {
      settle(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeRequest) {
      event.preventDefault();
      settle(false);
    }
  });

  document.body.appendChild(confirmLayer);

  return confirmLayer;
}

function showNext() {
  if (activeRequest || confirmQueue.length === 0) return;

  ensureConfirmHost();
  activeRequest = confirmQueue.shift();

  confirmTitle.textContent = activeRequest.title;
  confirmMessage.textContent = activeRequest.message;
  confirmCancel.textContent = activeRequest.cancelLabel;
  confirmSubmit.textContent = activeRequest.confirmLabel;
  confirmDialog.dataset.tone = activeRequest.tone;
  confirmLayer.classList.add("is-open");

  requestAnimationFrame(() => {
    confirmCancel.focus();
  });
}

function settle(result) {
  if (!activeRequest) return;

  const request = activeRequest;
  activeRequest = null;
  confirmLayer.classList.remove("is-open");
  request.resolve(result);

  requestAnimationFrame(() => {
    showNext();
  });
}

export function initConfirmHost() {
  return ensureConfirmHost();
}

export function confirmAction({
  title = "Please confirm",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
} = {}) {
  ensureConfirmHost();

  return new Promise((resolve) => {
    confirmQueue.push({
      title,
      message,
      confirmLabel,
      cancelLabel,
      tone,
      resolve,
    });

    showNext();
  });
}
