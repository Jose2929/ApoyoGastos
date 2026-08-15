const KEY = "apoyoGastos_fontSize";

export function initFontSize() {
  if (localStorage.getItem(KEY) === "large") {
    document.documentElement.setAttribute("data-font-size", "large");
  }
  updateLabel();
}

export function toggleFontSize() {
  const next = isLargeNow() ? "normal" : "large";
  if (next === "large") document.documentElement.setAttribute("data-font-size", "large");
  else document.documentElement.removeAttribute("data-font-size");
  localStorage.setItem(KEY, next);
  updateLabel();
}

function isLargeNow() {
  return document.documentElement.getAttribute("data-font-size") === "large";
}

function updateLabel() {
  const btn = document.getElementById("btn-font-size");
  if (!btn) return;
  const large = isLargeNow();
  btn.textContent = large ? "A+" : "A";
  btn.setAttribute("aria-pressed", large ? "true" : "false");
  btn.setAttribute(
    "aria-label",
    large ? "Letra grande activada. Tocar para volver a letra normal." : "Letra normal. Tocar para activar letra grande."
  );
}
