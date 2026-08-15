import { getState } from "./state.js";
import { marcarAvisoLeido } from "./db.js";
import { openOverlay, openImageViewer } from "./modal.js";
import { escapeHtml, formatFecha } from "./utils.js";

let open = false;
const closedLocally = new Set();

export function notifyUnreadAvisos(user) {
  if (!user || open) return;
  const { avisos } = getState();
  const pendientes = Object.entries(avisos)
    .filter(([id, a]) => !closedLocally.has(id) && !(a.leidoPor && a.leidoPor[user.id]))
    .sort((a, b) => a[1].fecha - b[1].fecha);
  if (!pendientes.length) return;

  open = true;
  const [id, aviso] = pendientes[0];

  const { overlay, close } = openOverlay(
    `
    <div class="modal-card">
      <div class="modal-body">
        <p class="aviso-modal-label">📢 Nuevo aviso</p>
        <p class="aviso-modal-texto">${escapeHtml(aviso.texto)}</p>
        ${aviso.imagen ? '<img class="aviso-thumb aviso-modal-thumb" id="aviso-modal-imagen" src="' + aviso.imagen + '" alt="Imagen del aviso" />' : ""}
        <p class="aviso-meta">${escapeHtml(aviso.autorNombre)} · ${formatFecha(aviso.fecha)}</p>
        <button class="btn btn-big" id="aviso-modal-cerrar">Cerrar</button>
      </div>
    </div>
  `,
    {
      onClose: () => {
        open = false;
        closedLocally.add(id);
        marcarAvisoLeido(id, user.id);
        notifyUnreadAvisos(user);
      },
    }
  );

  overlay.querySelector("#aviso-modal-cerrar").addEventListener("click", close);
  const imgEl = overlay.querySelector("#aviso-modal-imagen");
  if (imgEl) {
    imgEl.addEventListener("click", () => {
      openImageViewer(aviso.imagen, `aviso-${aviso.fecha}.jpg`);
    });
  }
}
