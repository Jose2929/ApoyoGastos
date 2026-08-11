const KEY = "apoyoGastos_theme";

export function initTheme() {
  const saved = localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") {
    document.documentElement.setAttribute("data-theme", saved);
  }
  updateIcon();
}

export function toggleTheme() {
  const next = isDarkNow() ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(KEY, next);
  updateIcon();
}

function isDarkNow() {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function updateIcon() {
  const btn = document.getElementById("btn-theme");
  if (!btn) return;
  btn.textContent = isDarkNow() ? "☀️" : "🌙";
}
