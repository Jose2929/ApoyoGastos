import { goBackView } from "./router.js";

const modalStack = [];

export function initBackGuard() {
  history.pushState({ appGuard: true }, "");
  window.addEventListener("popstate", handlePopState);
}

export function pushModal(closeFn) {
  modalStack.push(closeFn);
}

export function popModal(closeFn) {
  const i = modalStack.indexOf(closeFn);
  if (i !== -1) modalStack.splice(i, 1);
}

function handlePopState() {
  if (modalStack.length > 0) {
    modalStack[modalStack.length - 1]();
    rearm();
    return;
  }
  if (goBackView()) {
    rearm();
    return;
  }
  if (confirm("¿Quieres salir de la aplicación?")) {
    window.removeEventListener("popstate", handlePopState);
    history.back();
  } else {
    rearm();
  }
}

function rearm() {
  history.pushState({ appGuard: true }, "");
}
