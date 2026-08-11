import { getState } from "./state.js";
import { marcarAvisoLeido } from "./db.js";
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

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `
    <div class="modal-card">
      <p class="aviso-modal-label">📢 Nuevo aviso</p>
      <p class="aviso-modal-texto">${escapeHtml(aviso.texto)}</p>
      <p class="aviso-meta">${escapeHtml(aviso.autorNombre)} · ${formatFecha(aviso.fecha)}</p>
      <button class="btn btn-big" id="aviso-modal-cerrar">Cerrar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector("#aviso-modal-cerrar").addEventListener("click", () => {
    closedLocally.add(id);
    overlay.remove();
    open = false;
    marcarAvisoLeido(id, user.id);
    notifyUnreadAvisos(user);
  });
}
