export class BaseDialog {
  constructor(options = {}) {
    this.layer = document.createElement("div");
    this.layer.className = `feedback-base-layer ${options.className || ''}`;
    this.layer.innerHTML = `
      <div class="feedback-base-backdrop"></div>
      <section class="feedback-base-dialog" role="${options.role || 'dialog'}" ${options.ariaLabelledby ? `aria-labelledby="${options.ariaLabelledby}"` : ''} ${options.ariaDescribedby ? `aria-describedby="${options.ariaDescribedby}"` : ''}>
        <div class="feedback-base-content" id="${options.contentId || ''}"></div>
        <div class="feedback-base-actions"></div>
      </section>
    `;

    this.backdrop = this.layer.querySelector(".feedback-base-backdrop");
    this.dialog = this.layer.querySelector(".feedback-base-dialog");
    this.contentContainer = this.layer.querySelector(".feedback-base-content");
    this.actionsContainer = this.layer.querySelector(".feedback-base-actions");

    // Close on backdrop click (optional behavior)
    if (options.closeOnBackdrop !== false) {
      this.layer.addEventListener("click", (event) => {
        const clicked = event.target;
        if (clicked === this.layer || clicked === this.backdrop) {
          this.close(null);
        }
      });
    }

    // Close on Escape key
    this._handleKeyDown = (event) => {
      if (event.key === "Escape" && this.isOpen()) {
        event.preventDefault();
        this.close(null);
      }
    };
    document.addEventListener("keydown", this._handleKeyDown);
    
    // Add to body but hidden by default unless requested open
    if (options.hostToBody !== false) {
      document.body.appendChild(this.layer);
    }
  }

  isOpen() {
    return this.layer.classList.contains("is-open");
  }

  show() {
    this.layer.classList.add("is-open");
    // Subclasses should override and focus a specific element
  }

  hide() {
    this.layer.classList.remove("is-open");
  }

  close(result) {
    this.hide();
    if (this.onClose) {
      this.onClose(result);
    }
  }

  destroy() {
    document.removeEventListener("keydown", this._handleKeyDown);
    if (this.layer.parentElement) {
      this.layer.parentElement.removeChild(this.layer);
    }
  }
}
