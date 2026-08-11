import { getState, subscribe } from "../state.js";
import {
  addMiembro,
  updateMiembro,
  addBitacora,
  setConfig,
  loadBitacora,
  purgeComprobantesAntiguos,
} from "../db.js";
import { renderPinpad } from "../pinpad.js";
import { formatFecha, formatMoney, formatBytes, escapeHtml } from "../utils.js";
import { ROLES, ROLE_LABELS, DEFAULT_ACERCA_TEXTO, DEFAULT_AVISO_TEXTO, DEFAULT_DEPOSITO_TEXTO } from "../constants.js";

const ACCION_LABELS = {
  login: "Inició sesión",
  deposito: "Registró depósito",
  gasto: "Registró gasto",
  cambio_pin: "Cambió el PIN de",
  quitar_pin: "Quitó el PIN de",
  cambio_rol: "Cambió el rol de",
  reset_pregunta_pin: "Pidió que confirmara su PIN a",
  alta_integrante: "Dio de alta a",
  baja_integrante: "Dio de baja a",
  aviso_publicado: "Publicó un aviso",
  borrado_comprobantes: "Borró comprobantes antiguos",
  config_meta: "Actualizó la meta mensual",
  config_whatsapp: "Actualizó el enlace/mensajes de WhatsApp",
  config_acerca: "Actualizó el texto de Acerca de",
  edicion_movimiento: "Corrigió un movimiento",
};

const MENU_ITEMS = [
  { key: "integrantes", label: "Integrantes" },
  { key: "agregar", label: "Agregar integrante" },
  { key: "comprobantes", label: "Comprobantes" },
  { key: "enlace", label: "Enlace de la app" },
  { key: "mensajes", label: "Mensajes de WhatsApp" },
  { key: "acerca", label: "Modificar Acerca de" },
  { key: "bitacora", label: "Bitácora" },
];

export function render(container) {
  const { currentUser, config } = getState();

  container.innerHTML = `
    <div class="list-screen">
      <h1>Administración</h1>

      <h2 class="section-title">Meta mensual</h2>
      <div class="inline-form">
        <input class="input-money" id="meta-input" type="number" min="0" step="0.01" value="${config?.metaMensual || ""}" placeholder="$0.00" />
        <button class="btn" id="meta-guardar">Guardar</button>
      </div>

      <h2 class="section-title">Configuración</h2>
      <div class="admin-menu-list">
        ${MENU_ITEMS.map((it) => `<button type="button" class="admin-menu-item" data-modal="${it.key}">${it.label}<span class="chevron">›</span></button>`).join("")}
      </div>
    </div>
  `;

  async function logAccion(accion, detalle) {
    await addBitacora({
      miembroId: currentUser.id,
      miembroNombre: currentUser.nombre,
      accion,
      detalle,
      fecha: Date.now(),
    });
  }

  container.querySelector("#meta-guardar").addEventListener("click", async () => {
    const val = parseFloat(container.querySelector("#meta-input").value);
    if (!val || val <= 0) {
      alert("Ingresa una meta válida.");
      return;
    }
    await setConfig({ metaMensual: val });
    await logAccion("config_meta", formatMoney(val));
    alert("Meta mensual guardada.");
  });

  // --- Modal genérico ---
  function openModal(title, build) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h2 class="section-title" style="margin:0">${escapeHtml(title)}</h2>
          <button type="button" class="modal-close-btn" aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    let cleanup = null;
    const close = () => {
      if (cleanup) cleanup();
      overlay.remove();
    };
    overlay.querySelector(".modal-close-btn").addEventListener("click", close);
    const body = overlay.querySelector(".modal-body");
    cleanup = build(body, close) || null;
    return close;
  }

  function openPinCaptureModal(title, onDone) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal-card">
        <button type="button" class="btn btn-link" id="pin-capture-cerrar">‹ Cancelar</button>
        <div class="pin-capture-host"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#pin-capture-cerrar").addEventListener("click", () => overlay.remove());
    renderPinpad(overlay.querySelector(".pin-capture-host"), {
      title,
      onComplete: async (pin) => {
        await onDone(pin);
        overlay.remove();
      },
    });
  }

  container.querySelectorAll("[data-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = MENU_ITEMS.find((it) => it.key === btn.dataset.modal);
      const builders = {
        integrantes: buildIntegrantesModal,
        agregar: buildAgregarModal,
        comprobantes: buildComprobantesModal,
        enlace: buildEnlaceModal,
        mensajes: buildMensajesModal,
        acerca: buildAcercaModal,
        bitacora: buildBitacoraModal,
      };
      openModal(item.label, builders[item.key]);
    });
  });

  // --- Integrantes ---
  function buildIntegrantesModal(body) {
    function paint() {
      const { miembros } = getState();
      body.innerHTML = '<div class="member-admin-list" id="miembros-lista"></div>';
      const listEl = body.querySelector("#miembros-lista");
      Object.entries(miembros)
        .sort((a, b) => a[1].nombre.localeCompare(b[1].nombre, "es"))
        .forEach(([id, m]) => {
          const rol = m.rol || "normal";
          const row = document.createElement("div");
          row.className = "member-admin-row";
          row.innerHTML = `
            <span class="member-admin-name">${escapeHtml(m.nombre)}${m.activo === false ? " — inactivo" : ""}</span>
            <span class="member-admin-pin">PIN: ${m.pin ? escapeHtml(m.pin) : "sin PIN"}</span>
            <select class="input-select role-select">
              ${ROLES.map((r) => `<option value="${r}" ${r === rol ? "selected" : ""}>${ROLE_LABELS[r]}</option>`).join("")}
            </select>
            ${m.debePreguntarPin ? '<span class="member-admin-pending">Pendiente: se le pedirá cambiar su PIN al entrar</span>' : ""}
            <span class="member-admin-actions">
              <button class="btn btn-small" data-action="pin">Cambiar PIN</button>
              ${m.pin ? '<button class="btn btn-small" data-action="quitar-pin">Quitar PIN</button>' : ""}
              ${m.pin ? '<button class="btn btn-small" data-action="pedir-cambio">Pedir cambio de PIN al entrar</button>' : ""}
              <button class="btn btn-small" data-action="toggle">${m.activo === false ? "Dar de alta" : "Dar de baja"}</button>
            </span>
          `;

          row.querySelector(".role-select").addEventListener("change", async (e) => {
            const nuevoRol = e.target.value;
            await updateMiembro(id, { rol: nuevoRol });
            await logAccion("cambio_rol", `${m.nombre} → ${ROLE_LABELS[nuevoRol]}`);
          });

          row.querySelector('[data-action="pin"]').addEventListener("click", () => {
            openPinCaptureModal(`Nuevo PIN para ${m.nombre}`, async (pin) => {
              await updateMiembro(id, { pin, debePreguntarPin: false });
              await logAccion("cambio_pin", m.nombre);
            });
          });

          const quitarBtn = row.querySelector('[data-action="quitar-pin"]');
          if (quitarBtn) {
            quitarBtn.addEventListener("click", async () => {
              if (!confirm(`¿Quitar el PIN de ${m.nombre}? Podrá entrar solo tocando su nombre.`)) return;
              await updateMiembro(id, { pin: null, debePreguntarPin: false });
              await logAccion("quitar_pin", m.nombre);
            });
          }

          const pedirBtn = row.querySelector('[data-action="pedir-cambio"]');
          if (pedirBtn) {
            pedirBtn.addEventListener("click", async () => {
              await updateMiembro(id, { debePreguntarPin: true });
              await logAccion("reset_pregunta_pin", m.nombre);
            });
          }

          row.querySelector('[data-action="toggle"]').addEventListener("click", async () => {
            const nuevoEstado = m.activo === false;
            await updateMiembro(id, { activo: nuevoEstado });
            await logAccion(nuevoEstado ? "alta_integrante" : "baja_integrante", m.nombre);
          });

          listEl.appendChild(row);
        });
    }
    paint();
    return subscribe(paint);
  }

  // --- Agregar integrante ---
  function buildAgregarModal(body) {
    body.innerHTML = `
      <div class="inline-form"><input class="input-text" id="nuevo-nombre" type="text" placeholder="Nombre" maxlength="40" /></div>
      <div class="inline-form">
        <select id="nuevo-rol" class="input-select">
          ${ROLES.map((r) => `<option value="${r}">${ROLE_LABELS[r]}</option>`).join("")}
        </select>
      </div>
      <label class="checkbox-label">
        <input type="checkbox" id="nuevo-sin-pin" /> Sin PIN (entra solo tocando su nombre)
      </label>
      <button class="btn btn-big" id="nuevo-agregar">Agregar integrante</button>
      <p class="foto-status" id="nuevo-status"></p>
    `;

    body.querySelector("#nuevo-agregar").addEventListener("click", () => {
      const nombreInput = body.querySelector("#nuevo-nombre");
      const nombre = nombreInput.value.trim();
      if (!nombre) {
        alert("Escribe un nombre.");
        return;
      }
      const rol = body.querySelector("#nuevo-rol").value;
      const sinPinInput = body.querySelector("#nuevo-sin-pin");
      const sinPin = sinPinInput.checked;
      const statusEl = body.querySelector("#nuevo-status");

      if (sinPin) {
        addMiembro({ nombre, pin: null, rol, activo: true, debePreguntarPin: false }).then(async () => {
          await logAccion("alta_integrante", nombre);
          nombreInput.value = "";
          sinPinInput.checked = false;
          statusEl.textContent = `${nombre} agregado ✓`;
        });
      } else {
        openPinCaptureModal(`Define el PIN para ${nombre}`, async (pin) => {
          await addMiembro({ nombre, pin, rol, activo: true, debePreguntarPin: true });
          await logAccion("alta_integrante", nombre);
          nombreInput.value = "";
          statusEl.textContent = `${nombre} agregado ✓`;
        });
      }
    });
  }

  // --- Comprobantes ---
  function buildComprobantesModal(body) {
    body.innerHTML = `
      <p class="field-hint">Borra las fotos de comprobantes antiguos para liberar espacio (el registro del movimiento se conserva, solo se quita la foto).</p>
      <div class="inline-form">
        <select id="purge-meses" class="input-select">
          <option value="3">Más de 3 meses</option>
          <option value="6" selected>Más de 6 meses</option>
          <option value="12">Más de 12 meses</option>
        </select>
        <button class="btn" id="purge-btn">Borrar</button>
      </div>
      <p id="purge-resultado"></p>
    `;
    body.querySelector("#purge-btn").addEventListener("click", async () => {
      const meses = parseInt(body.querySelector("#purge-meses").value, 10);
      const limite = Date.now() - meses * 30 * 24 * 60 * 60 * 1000;
      const resultadoEl = body.querySelector("#purge-resultado");
      resultadoEl.textContent = "Borrando...";
      const bytes = await purgeComprobantesAntiguos(limite);
      resultadoEl.textContent =
        bytes > 0 ? `Se liberaron ${formatBytes(bytes)}.` : "No había comprobantes tan antiguos.";
      await logAccion("borrado_comprobantes", formatBytes(bytes));
    });
  }

  // --- Enlace de la app ---
  function buildEnlaceModal(body) {
    const { config } = getState();
    body.innerHTML = `
      <label class="field-label" for="wa-url">Enlace de la app</label>
      <input class="input-text" id="wa-url" type="url" placeholder="https://tu-app.com" value="${escapeHtml(config?.appUrl || "")}" />
      <button class="btn btn-big" id="wa-url-guardar">Guardar enlace</button>
    `;
    body.querySelector("#wa-url-guardar").addEventListener("click", async () => {
      const appUrl = body.querySelector("#wa-url").value.trim();
      await setConfig({ appUrl });
      await logAccion("config_whatsapp", "enlace");
      alert("Enlace guardado.");
    });
  }

  // --- Mensajes de WhatsApp ---
  function buildMensajesModal(body) {
    const { config } = getState();
    body.innerHTML = `
      <label class="field-label" for="wa-aviso">Mensaje al compartir un aviso</label>
      <textarea class="input-textarea" id="wa-aviso" maxlength="300">${escapeHtml(config?.whatsappAvisoTexto || DEFAULT_AVISO_TEXTO)}</textarea>
      <label class="field-label" for="wa-deposito">Mensaje al compartir un depósito (usa {monto} donde quieras que aparezca la cantidad)</label>
      <textarea class="input-textarea" id="wa-deposito" maxlength="300">${escapeHtml(config?.whatsappDepositoTexto || DEFAULT_DEPOSITO_TEXTO)}</textarea>
      <button class="btn btn-big" id="wa-msg-guardar">Guardar mensajes</button>
    `;
    body.querySelector("#wa-msg-guardar").addEventListener("click", async () => {
      const whatsappAvisoTexto = body.querySelector("#wa-aviso").value.trim();
      const whatsappDepositoTexto = body.querySelector("#wa-deposito").value.trim();
      await setConfig({ whatsappAvisoTexto, whatsappDepositoTexto });
      await logAccion("config_whatsapp", "mensajes");
      alert("Mensajes guardados.");
    });
  }

  // --- Acerca de ---
  function buildAcercaModal(body) {
    const { config } = getState();
    body.innerHTML = `
      <label class="field-label" for="acerca-texto">Texto que verán los integrantes</label>
      <textarea class="input-textarea" id="acerca-texto" maxlength="1000">${escapeHtml(config?.acercaTexto || DEFAULT_ACERCA_TEXTO)}</textarea>
      <button class="btn btn-big" id="acerca-guardar">Guardar texto</button>
    `;
    body.querySelector("#acerca-guardar").addEventListener("click", async () => {
      const acercaTexto = body.querySelector("#acerca-texto").value.trim();
      await setConfig({ acercaTexto });
      await logAccion("config_acerca", "");
      alert("Texto de Acerca de guardado.");
    });
  }

  // --- Bitácora ---
  function buildBitacoraModal(body) {
    body.innerHTML = '<p class="empty">Cargando...</p>';
    loadBitacora().then((bitacora) => {
      const entries = Object.values(bitacora).sort((a, b) => b.fecha - a.fecha);
      if (!entries.length) {
        body.innerHTML = '<p class="empty">Sin registros.</p>';
        return;
      }
      body.innerHTML = '<div class="bitacora-list" id="bitacora-lista"></div>';
      const el = body.querySelector("#bitacora-lista");
      entries.forEach((e) => {
        const row = document.createElement("div");
        row.className = "bitacora-row";
        const label = ACCION_LABELS[e.accion] || e.accion;
        row.innerHTML = `
          <span class="bitacora-quien">${escapeHtml(e.miembroNombre)}</span>
          <span class="bitacora-accion">${escapeHtml(label)}${e.detalle ? " — " + escapeHtml(String(e.detalle)) : ""}</span>
          <span class="bitacora-cuando">${formatFecha(e.fecha)}</span>
        `;
        el.appendChild(row);
      });
    });
  }
}
