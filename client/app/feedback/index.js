import { initConfirmHost, confirmAction } from "./confirm.js";
import { initNotificationsHost, notify } from "./notifications.js";

export function initFeedbackHost() {
  initNotificationsHost();
  initConfirmHost();
}

export { notify, confirmAction };
