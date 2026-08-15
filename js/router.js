const views = {};
let cleanupCurrent = null;
let currentName = null;
let currentParams = {};
const backStack = [];

export function registerView(name, mod) {
  views[name] = mod;
}

export function switchView(name, params = {}, { isBack = false, replace = false } = {}) {
  if (!views[name]) return;
  if (!isBack && !replace && currentName) {
    backStack.push({ name: currentName, params: currentParams });
    if (backStack.length > 50) backStack.shift();
  }
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
  currentParams = params;
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.nav === name);
  });
  window.scrollTo(0, 0);
}

export function goBackView() {
  const prev = backStack.pop();
  if (!prev) return false;
  switchView(prev.name, prev.params, { isBack: true });
  return true;
}

export function resetViewHistory() {
  backStack.length = 0;
}

export function initNav(onNavigate) {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => onNavigate(btn.dataset.nav));
  });
}

export function getCurrentView() {
  return currentName;
}
