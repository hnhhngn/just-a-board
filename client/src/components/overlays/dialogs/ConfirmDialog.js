import { BaseDialog } from './BaseDialog.js';

let confirmDialogInstance = null;
const confirmQueue = [];
let activeRequest = null;

class ConfirmDialogUI extends BaseDialog {
  constructor() {
    super({
      className: 'feedback-confirm-layer',
      role: 'alertdialog',
      ariaLabelledby: 'feedbackConfirmTitle',
      ariaDescribedby: 'feedbackConfirmMessage',
    });

    this.contentContainer.innerHTML = `
      <h2 class="feedback-confirm-title" id="feedbackConfirmTitle"></h2>
      <p class="feedback-confirm-message" id="feedbackConfirmMessage"></p>
    `;
    this.actionsContainer.innerHTML = `
      <button type="button" class="feedback-confirm-btn secondary" data-action="cancel"></button>
      <button type="button" class="feedback-confirm-btn primary" data-action="confirm"></button>
    `;

    this.confirmTitle = this.contentContainer.querySelector('.feedback-confirm-title');
    this.confirmMessage = this.contentContainer.querySelector('.feedback-confirm-message');
    this.confirmCancel = this.actionsContainer.querySelector('[data-action="cancel"]');
    this.confirmSubmit = this.actionsContainer.querySelector('[data-action="confirm"]');

    this.confirmCancel.addEventListener("click", () => this.handleSettle(false));
    this.confirmSubmit.addEventListener("click", () => this.handleSettle(true));
  }

  handleSettle(result) {
    if (!activeRequest) return;
    const request = activeRequest;
    activeRequest = null;
    this.hide();
    request.resolve(result);

    requestAnimationFrame(() => {
      showNext();
    });
  }

  // Override to map the backdrop click and Escape key behavior properly for Confirm queue
  close(result) {
    this.handleSettle(false); // Defaulting to false (cancel) on backdrop/esc
  }
}

export function initConfirmHost() {
  if (!confirmDialogInstance) {
    confirmDialogInstance = new ConfirmDialogUI();
  }
  return confirmDialogInstance.layer;
}

function showNext() {
  if (activeRequest || confirmQueue.length === 0) return;

  initConfirmHost();
  activeRequest = confirmQueue.shift();

  confirmDialogInstance.confirmTitle.textContent = activeRequest.title;
  confirmDialogInstance.confirmMessage.textContent = activeRequest.message;
  confirmDialogInstance.confirmCancel.textContent = activeRequest.cancelLabel;
  confirmDialogInstance.confirmSubmit.textContent = activeRequest.confirmLabel;
  confirmDialogInstance.dialog.dataset.tone = activeRequest.tone;

  confirmDialogInstance.show();

  requestAnimationFrame(() => {
    confirmDialogInstance.confirmCancel.focus();
  });
}

export function confirmAction({
  title = "Please confirm",
  message = "",
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
} = {}) {
  initConfirmHost();

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
