import { escapeHtml } from "./utils.js";

let openCount = 0;
let savedScrollY = 0;

function lockScroll() {
  if (openCount === 0) {
    savedScrollY = window.scrollY;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
  }
  openCount++;
}

function unlockScroll() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) {
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    window.scrollTo(0, savedScrollY);
  }
}

export function openOverlay(cardHtml, { onClose } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = cardHtml;
  document.body.appendChild(overlay);
  lockScroll();

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKeydown);
    unlockScroll();
    overlay.remove();
    if (onClose) onClose();
  }

  function onKeydown(e) {
    if (e.key === "Escape") close();
  }
  document.addEventListener("keydown", onKeydown);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  return { overlay, close };
}

export function openImageViewer(dataUrl, downloadName) {
  const { overlay, close } = openOverlay(`
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="section-title" style="margin:0">Imagen</h2>
        <button type="button" class="modal-close-btn" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <img class="image-viewer-img" src="${dataUrl}" alt="Imagen adjunta" />
        <div class="modal-actions">
          <a class="btn btn-whatsapp" href="${dataUrl}" download="${escapeHtml(downloadName)}">⬇️ Descargar</a>
          <button type="button" class="btn btn-secondary" id="image-viewer-cerrar">Cerrar</button>
        </div>
      </div>
    </div>
  `);
  overlay.querySelector(".modal-close-btn").addEventListener("click", close);
  overlay.querySelector("#image-viewer-cerrar").addEventListener("click", close);
  return close;
}
