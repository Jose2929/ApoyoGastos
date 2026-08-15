import { getState } from "./state.js";
import { updateMovimiento, addBitacora } from "./db.js";
import { openOverlay } from "./modal.js";
import { escapeHtml, formatMoney } from "./utils.js";

export function openMovementEditModal(id, m) {
  const { miembros, currentUser } = getState();

  const { overlay, close } = openOverlay(`
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="section-title" style="margin:0">Corregir movimiento</h2>
        <button type="button" class="modal-close-btn" aria-label="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="field-group">
          <label class="field-label" for="edit-monto">Monto</label>
          <input class="input-money" id="edit-monto" type="number" min="0" step="0.01" value="${m.monto}" />
        </div>
        <div class="field-group">
          <label class="field-label" for="edit-miembro">Quién ${m.tipo === "deposito" ? "aportó" : "gastó"}</label>
          <select id="edit-miembro" class="input-select">
            ${Object.entries(miembros)
              .map(
                ([mid, mm]) =>
                  `<option value="${mid}" ${mid === m.miembroId ? "selected" : ""}>${escapeHtml(mm.nombre)}</option>`
              )
              .join("")}
          </select>
        </div>
        ${
          m.comprobante
            ? `<div class="field-group">
                 <button type="button" class="btn btn-small btn-danger" id="edit-borrar-foto">Borrar imagen adjunta</button>
                 <p id="edit-foto-status" class="foto-status"></p>
               </div>`
            : ""
        }
        <p class="form-error" id="edit-error" hidden></p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="edit-cancelar">Cancelar</button>
          <button type="button" class="btn" id="edit-guardar">Guardar cambios</button>
        </div>
      </div>
    </div>
  `);

  overlay.querySelector(".modal-close-btn").addEventListener("click", close);
  overlay.querySelector("#edit-cancelar").addEventListener("click", close);

  let borrarFoto = false;
  const borrarBtn = overlay.querySelector("#edit-borrar-foto");
  if (borrarBtn) {
    borrarBtn.addEventListener("click", () => {
      borrarFoto = true;
      overlay.querySelector("#edit-foto-status").textContent = "Se borrará la imagen al guardar.";
      borrarBtn.disabled = true;
    });
  }

  overlay.querySelector("#edit-guardar").addEventListener("click", async () => {
    const errorEl = overlay.querySelector("#edit-error");
    const monto = parseFloat(overlay.querySelector("#edit-monto").value);
    if (!monto || monto <= 0) {
      errorEl.textContent = "Ingresa un monto válido.";
      errorEl.hidden = false;
      return;
    }
    const nuevoMiembroId = overlay.querySelector("#edit-miembro").value;
    const nuevoMiembroNombre = miembros[nuevoMiembroId]?.nombre || m.miembroNombre;

    const patch = { monto, miembroId: nuevoMiembroId, miembroNombre: nuevoMiembroNombre };
    if (borrarFoto) patch.comprobante = null;

    const btn = overlay.querySelector("#edit-guardar");
    btn.disabled = true;
    btn.textContent = "Guardando...";
    try {
      await updateMovimiento(id, patch);
      await addBitacora({
        miembroId: currentUser.id,
        miembroNombre: currentUser.nombre,
        accion: "edicion_movimiento",
        detalle: `${m.miembroNombre} ${formatMoney(m.monto)} → ${nuevoMiembroNombre} ${formatMoney(monto)}`,
        fecha: Date.now(),
      });
      close();
    } catch (e) {
      errorEl.textContent = "No se pudo guardar. Intenta de nuevo.";
      errorEl.hidden = false;
      btn.disabled = false;
      btn.textContent = "Guardar cambios";
    }
  });
}
