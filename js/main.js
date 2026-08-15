import { listenMiembros, listenMovimientos, listenAvisos, listenConfig } from "./db.js";
import { setState } from "./state.js";
import { switchView, registerView, initNav, resetViewHistory } from "./router.js";
import { loadSession, clearSession } from "./session.js";
import { notifyUnreadAvisos } from "./avisoModal.js";
import { initTheme, toggleTheme } from "./theme.js";
import { initFontSize, toggleFontSize } from "./fontSize.js";
import { initBackGuard } from "./backGuard.js";
import { DEFAULT_TITULO_APP } from "./constants.js";

import * as loginView from "./views/login.js";
import * as homeView from "./views/home.js";
import * as movimientoView from "./views/movimiento.js";
import * as movimientosView from "./views/movimientos.js";
import * as contribucionesView from "./views/contribuciones.js";
import * as avisosView from "./views/avisos.js";
import * as adminView from "./views/admin.js";
import * as acercaView from "./views/acerca.js";

registerView("login", loginView);
registerView("home", homeView);
registerView("movimiento", movimientoView);
registerView("movimientos", movimientosView);
registerView("contribuciones", contribucionesView);
registerView("avisos", avisosView);
registerView("admin", adminView);
registerView("acerca", acercaView);

initTheme();
document.getElementById("btn-theme").addEventListener("click", toggleTheme);
initFontSize();
document.getElementById("btn-font-size").addEventListener("click", toggleFontSize);
initBackGuard();

let sessionUser = null;
let avisosLoaded = false;

listenMiembros((miembros) => setState({ miembros }));
listenMovimientos((movimientos) => setState({ movimientos }));
listenAvisos((avisos) => {
  setState({ avisos });
  avisosLoaded = true;
  tryNotifyUnread();
});
listenConfig((config) => {
  setState({ config });
  const titulo = config?.tituloApp || DEFAULT_TITULO_APP;
  document.title = titulo;
  document.getElementById("app-title").textContent = `💊 ${titulo}`;
});

function tryNotifyUnread() {
  if (sessionUser && avisosLoaded) notifyUnreadAvisos(sessionUser);
}

const bottomNav = document.getElementById("bottom-nav");
const adminNavBtn = document.querySelector('[data-nav="admin"]');
const btnSalir = document.getElementById("btn-salir");

function applySession(user) {
  setState({ currentUser: user });
  bottomNav.hidden = !user;
  adminNavBtn.hidden = !(user && user.rol === "admin");
  btnSalir.hidden = !user;
  resetViewHistory();
  switchView(user ? "home" : "login", {}, { replace: true });
  sessionUser = user;
  if (user) tryNotifyUnread();
}

window.addEventListener("session-changed", (e) => applySession(e.detail));

btnSalir.addEventListener("click", () => {
  if (confirm("¿Salir y volver a la pantalla de inicio?")) {
    clearSession();
  }
});

initNav((name) => switchView(name));

applySession(loadSession());

// PWA: registro del service worker (no bloquea nada del arranque anterior)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch((err) => {
      console.error("No se pudo registrar el service worker:", err);
    });
  });
}
