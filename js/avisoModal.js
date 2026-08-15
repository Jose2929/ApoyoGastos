import { getState } from "./state.js";
import { marcarAvisoLeido } from "./db.js";
import { openOverlay, openImageViewer } from "./modal.js";
import { escapeHtml, formatFecha } from "./utils.js";

let open = false;
const closedLocally = new Set();

export function openAvisoModal(aviso, { label = "", onClose } = {}) {
  const { overlay, close } = openOverlay(
    `
    <div class="modal-card">
      <div class="modal-body">
        ${label ? `<p class="aviso-modal-label">${escapeHtml(label)}</p>` : ""}
        <p class="aviso-modal-texto">${escapeHtml(aviso.texto)}</p>
        ${aviso.imagen ? '<img class="aviso-thumb aviso-modal-thumb" id="aviso-modal-imagen" src="' + aviso.imagen + '" alt="Imagen del aviso" />' : ""}
        <p class="aviso-meta">${escapeHtml(aviso.autorNombre)} · ${formatFecha(aviso.fecha)}</p>
        <button class="btn btn-big" id="aviso-modal-cerrar">Cerrar</button>
      </div>
    </div>
  `,
    { onClose }
  );

  overlay.querySelector("#aviso-modal-cerrar").addEventListener("click", close);
  const imgEl = overlay.querySelector("#aviso-modal-imagen");
  if (imgEl) {
    imgEl.addEventListener("click", () => {
      openImageViewer(aviso.imagen, `aviso-${aviso.fecha}.jpg`);
    });
  }
  return close;
}

export function notifyUnreadAvisos(user) {
  if (!user || open) return;
  const { avisos } = getState();
  const pendientes = Object.entries(avisos)
    .filter(([id, a]) => !closedLocally.has(id) && !(a.leidoPor && a.leidoPor[user.id]))
    .sort((a, b) => a[1].fecha - b[1].fecha);
  if (!pendientes.length) return;

  open = true;
  const [id, aviso] = pendientes[0];

  openAvisoModal(aviso, {
    label: "📢 Nuevo aviso",
    onClose: () => {
      open = false;
      closedLocally.add(id);
      marcarAvisoLeido(id, user.id);
      notifyUnreadAvisos(user);
    },
  });
}
