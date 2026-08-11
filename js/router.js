const views = {};
let cleanupCurrent = null;
let currentName = null;

export function registerView(name, mod) {
  views[name] = mod;
}

export function switchView(name, params = {}) {
  if (!views[name]) return;
  if (cleanupCurrent) {
    try {
      cleanupCurrent();
    } catch (e) {
      /* view cleanup best-effort */
    }
    cleanupCurrent = null;
  }
  const container = document.getElementById("view-container");
  container.innerHTML = "";
  const result = views[name].render(container, params);
  cleanupCurrent = typeof result === "function" ? result : null;
  currentName = name;
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.nav === name);
  });
  window.scrollTo(0, 0);
}

export function initNav(onNavigate) {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => onNavigate(btn.dataset.nav));
  });
}

export function getCurrentView() {
  return currentName;
}
