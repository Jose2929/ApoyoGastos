import { getState } from "../state.js";
import { addMovimiento, addBitacora } from "../db.js";
import { switchView, goBackView } from "../router.js";
import {
  compressImageToBase64,
  formatMoney,
  escapeHtml,
  buildWhatsappUrl,
  buildDepositoMensaje,
} from "../utils.js";

const CATEGORIAS = ["Medicinas", "Consulta", "Estudios", "Otro"];

export function render(container, { tipo }) {
  const isDeposito = tipo === "deposito";
  const { currentUser, config } = getState();

  if (!isDeposito && currentUser.rol !== "admin" && currentUser.rol !== "gestor") {
    switchView("home", {}, { replace: true });
    return;
  }

  const metaPorIntegrante = config?.metaPorIntegrante || 0;
  const mostrarChips = isDeposito && metaPorIntegrante > 0;
  const chipMas = metaPorIntegrante + 100;
  const chipMenos = metaPorIntegrante - 100;
  const mostrarChipMenos = chipMenos > 0;

  container.innerHTML = `
    <div class="form-screen">
      <h1>${isDeposito ? "Registrar depósito" : "Registrar gasto"}</h1>
      ${isDeposito ? `<p class="quien-info">Depositando a nombre de: <strong>${escapeHtml(currentUser.nombre)}</strong></p>` : ""}

      <label class="field-label" ${mostrarChips ? "" : 'for="monto"'}>Monto</label>
      ${
        mostrarChips
          ? `
        <div class="filter-pills" id="monto-chips">
          <button type="button" class="pill chip-monto selected" data-monto="${metaPorIntegrante}">${formatMoney(metaPorIntegrante)}</button>
          <button type="button" class="pill chip-monto" data-monto="${chipMas}">${formatMoney(chipMas)}</button>
          ${mostrarChipMenos ? `<button type="button" class="pill chip-monto" data-monto="${chipMenos}">${formatMoney(chipMenos)}</button>` : ""}
          <button type="button" class="pill chip-monto" data-monto="otro">Otro</button>
        </div>`
          : ""
      }
      <input class="input-money" id="monto" type="number" inputmode="decimal" min="0" step="0.01" placeholder="$0.00" ${mostrarChips ? "hidden" : ""} value="${mostrarChips ? metaPorIntegrante : ""}" />

      ${
        !isDeposito
          ? `
        <label class="field-label">Categoría</label>
        <div class="category-grid" id="categorias">
          ${CATEGORIAS.map((c) => `<button type="button" class="btn category-btn" data-cat="${c}">${c}</button>`).join("")}
        </div>
        <label class="field-label" for="comentario">Comentario (opcional)</label>
        <input class="input-text" id="comentario" type="text" maxlength="140" placeholder="Ej. Consulta con el Dr. Pérez" />
      `
          : ""
      }

      ${
        !isDeposito
          ? `
        <label class="field-label">Foto del comprobante (opcional)</label>
        <input class="visually-hidden" id="foto" type="file" accept="image/*" capture="environment" />
        <button type="button" class="btn btn-secondary" id="btn-subir-foto">📷 Subir foto</button>
        <div class="foto-preview" id="foto-preview" hidden>
          <img id="foto-preview-img" alt="Comprobante" />
          <button type="button" class="btn btn-small btn-danger" id="btn-eliminar-foto">Eliminar foto</button>
        </div>
        <p class="foto-status" id="foto-status"></p>
      `
          : ""
      }

      <p class="form-error" id="form-error" hidden></p>
      <button class="btn btn-big btn-deposit" id="btn-guardar">Guardar</button>
      <button class="btn btn-big btn-danger" id="btn-cancelar">Cancelar</button>
    </div>
  `;

  container.querySelector("#btn-cancelar").addEventListener("click", () => {
    if (!goBackView()) switchView("home");
  });

  if (mostrarChips) {
    const chipsWrap = container.querySelector("#monto-chips");
    const montoInput = container.querySelector("#monto");
    chipsWrap.querySelectorAll(".chip-monto").forEach((chip) => {
      chip.addEventListener("click", () => {
        chipsWrap.querySelectorAll(".chip-monto").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        if (chip.dataset.monto === "otro") {
          montoInput.hidden = false;
          montoInput.value = "";
          montoInput.focus();
        } else {
          montoInput.hidden = true;
          montoInput.value = chip.dataset.monto;
        }
      });
    });
  }

  let categoriaSel = null;
  if (!isDeposito) {
    container.querySelectorAll(".category-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        container.querySelectorAll(".category-btn").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
        categoriaSel = btn.dataset.cat;
      });
    });
  }

  let comprobanteBase64 = null;
  if (!isDeposito) {
    const fotoInput = container.querySelector("#foto");
    const fotoStatus = container.querySelector("#foto-status");
    const subirBtn = container.querySelector("#btn-subir-foto");
    const previewWrap = container.querySelector("#foto-preview");
    const previewImg = container.querySelector("#foto-preview-img");
    const eliminarBtn = container.querySelector("#btn-eliminar-foto");

    subirBtn.addEventListener("click", () => fotoInput.click());

    fotoInput.addEventListener("change", async () => {
      const file = fotoInput.files[0];
      if (!file) return;
      fotoStatus.textContent = "Comprimiendo foto...";
      try {
        comprobanteBase64 = await compressImageToBase64(file);
        previewImg.src = comprobanteBase64;
        previewWrap.hidden = false;
        subirBtn.hidden = true;
        fotoStatus.textContent = "";
      } catch (e) {
        comprobanteBase64 = null;
        fotoStatus.textContent = "No se pudo procesar la foto, intenta con otra.";
      }
    });

    eliminarBtn.addEventListener("click", () => {
      comprobanteBase64 = null;
      fotoInput.value = "";
      previewWrap.hidden = true;
      subirBtn.hidden = false;
      fotoStatus.textContent = "";
    });
  }

  const errorEl = container.querySelector("#form-error");
  const guardarBtn = container.querySelector("#btn-guardar");

  guardarBtn.addEventListener("click", async () => {
    const monto = parseFloat(container.querySelector("#monto").value);
    errorEl.hidden = true;

    if (!monto || monto <= 0) return showError("Ingresa un monto válido.");
    if (!isDeposito && !categoriaSel) return showError("Elige una categoría.");

    guardarBtn.disabled = true;
    guardarBtn.textContent = "Guardando...";

    const data = {
      tipo,
      monto,
      miembroId: currentUser.id,
      miembroNombre: currentUser.nombre,
      fecha: Date.now(),
      comprobante: comprobanteBase64,
    };
    if (!isDeposito) {
      data.categoria = categoriaSel;
      data.comentario = container.querySelector("#comentario").value.trim();
    }

    try {
      const { movimientos, config } = getState();
      await addMovimiento(data);
      await addBitacora({
        miembroId: currentUser.id,
        miembroNombre: currentUser.nombre,
        accion: tipo,
        detalle: formatMoney(monto),
        fecha: Date.now(),
      });

      if (isDeposito) {
        const excedente = calcularExcedente(movimientos, config, currentUser.id, data);
        showSuccessDeposito(monto, excedente, config);
      } else {
        switchView("home", {}, { replace: true });
      }
    } catch (e) {
      showError("No se pudo guardar. Revisa tu conexión e intenta de nuevo.");
      guardarBtn.disabled = false;
      guardarBtn.textContent = "Guardar";
    }
  });

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function showSuccessDeposito(monto, excedente, config) {
    container.innerHTML = `
      <div class="form-success">
        <p class="success-check">✅ ¡Depósito registrado!</p>
        ${excedente > 0 ? `<p class="status-thanks">¡Gracias por tu aportación extra de ${formatMoney(excedente)}! 🙏</p>` : ""}
        <button class="btn btn-big btn-whatsapp" id="btn-compartir-wa">Compartir mi depósito por WhatsApp</button>
        <button class="btn btn-secondary" id="btn-volver-inicio">Volver al inicio</button>
      </div>
    `;
    container.querySelector("#btn-compartir-wa").addEventListener("click", () => {
      const mensaje = buildDepositoMensaje(config, formatMoney(monto));
      window.open(buildWhatsappUrl(mensaje), "_blank");
    });
    container.querySelector("#btn-volver-inicio").addEventListener("click", () =>
      switchView("home", {}, { replace: true })
    );
  }
}

function calcularExcedente(movimientosPrevios, config, miembroId, nuevoMov) {
  const meta = config?.metaPorIntegrante || 0;
  if (!meta) return 0;
  const fechaNueva = new Date(nuevoMov.fecha);
  const y = fechaNueva.getFullYear();
  const mo = fechaNueva.getMonth();

  let sumaPrevia = 0;
  Object.values(movimientosPrevios).forEach((mv) => {
    if (mv.tipo === "deposito" && mv.miembroId === miembroId) {
      const f = new Date(mv.fecha);
      if (f.getFullYear() === y && f.getMonth() === mo) sumaPrevia += mv.monto;
    }
  });

  const totalDespues = sumaPrevia + nuevoMov.monto;
  if (totalDespues <= meta) return 0;
  return Math.min(nuevoMov.monto, totalDespues - meta);
}
