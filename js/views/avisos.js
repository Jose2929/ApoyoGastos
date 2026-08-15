import { getState, subscribe } from "../state.js";
import { addAviso, addBitacora } from "../db.js";
import {
  formatFecha,
  escapeHtml,
  buildWhatsappUrl,
  buildAvisoMensaje,
  compressImageToBase64,
} from "../utils.js";
import { openAvisoModal } from "../avisoModal.js";

const AVISO_IMAGEN_OPTS = { maxDim: 1400, targetBytes: 250000 };

export function render(container) {
  const { currentUser } = getState();
  const puedePublicar = currentUser?.rol === "admin" || currentUser?.rol === "gestor";

  container.innerHTML = `
    <div class="list-screen">
      <h1>Avisos</h1>
      ${
        puedePublicar
          ? `
        <div class="aviso-form">
          <input class="input-text" id="aviso-texto" type="text" maxlength="200" placeholder="Escribe un aviso..." />
          <input class="visually-hidden" id="aviso-foto" type="file" accept="image/*" capture="environment" />
          <button type="button" class="btn btn-secondary" id="btn-subir-foto-aviso">📷 Agregar imagen (opcional)</button>
          <div class="foto-preview" id="aviso-foto-preview" hidden>
            <img id="aviso-foto-preview-img" alt="Imagen del aviso" />
            <button type="button" class="btn btn-small btn-danger" id="btn-eliminar-foto-aviso">Eliminar imagen</button>
          </div>
          <p class="foto-status" id="aviso-foto-status"></p>
          <button class="btn" id="aviso-publicar">Publicar aviso</button>
          <div id="aviso-compartir" hidden>
            <p class="foto-status">✅ Aviso publicado.</p>
            <button class="btn btn-whatsapp" id="aviso-wa">Compartir por WhatsApp</button>
          </div>
        </div>`
          : ""
      }
      <div class="aviso-list" id="lista"></div>
    </div>
  `;

  const listaEl = container.querySelector("#lista");

  function repaint() {
    const { avisos } = getState();
    const lista = Object.values(avisos).sort((a, b) => b.fecha - a.fecha);
    listaEl.innerHTML = "";
    if (!lista.length) {
      listaEl.innerHTML = '<p class="empty">No hay avisos todavía.</p>';
      return;
    }
    lista.forEach((a) => {
      const el = document.createElement("button");
      el.type = "button";
      el.className = "aviso-card";
      el.innerHTML = `
        <p class="aviso-texto">${escapeHtml(a.texto)}</p>
        ${a.imagen ? '<img class="aviso-thumb" src="' + a.imagen + '" alt="Imagen del aviso" />' : ""}
        <p class="aviso-meta">${escapeHtml(a.autorNombre)} · ${formatFecha(a.fecha)}</p>
      `;
      el.addEventListener("click", () => openAvisoModal(a));
      listaEl.appendChild(el);
    });
  }

  if (puedePublicar) {
    let imagenBase64 = null;
    const fotoInput = container.querySelector("#aviso-foto");
    const fotoStatus = container.querySelector("#aviso-foto-status");
    const subirBtn = container.querySelector("#btn-subir-foto-aviso");
    const previewWrap = container.querySelector("#aviso-foto-preview");
    const previewImg = container.querySelector("#aviso-foto-preview-img");
    const eliminarBtn = container.querySelector("#btn-eliminar-foto-aviso");

    subirBtn.addEventListener("click", () => fotoInput.click());

    fotoInput.addEventListener("change", async () => {
      const file = fotoInput.files[0];
      if (!file) return;
      fotoStatus.textContent = "Comprimiendo foto...";
      try {
        imagenBase64 = await compressImageToBase64(file, AVISO_IMAGEN_OPTS);
        previewImg.src = imagenBase64;
        previewWrap.hidden = false;
        subirBtn.hidden = true;
        fotoStatus.textContent = "";
      } catch (e) {
        imagenBase64 = null;
        fotoStatus.textContent = "No se pudo procesar la foto, intenta con otra.";
      }
    });

    eliminarBtn.addEventListener("click", () => {
      imagenBase64 = null;
      fotoInput.value = "";
      previewWrap.hidden = true;
      subirBtn.hidden = false;
      fotoStatus.textContent = "";
    });

    const compartirWrap = container.querySelector("#aviso-compartir");
    container.querySelector("#aviso-publicar").addEventListener("click", async () => {
      const input = container.querySelector("#aviso-texto");
      const texto = input.value.trim();
      if (!texto) return;
      await addAviso({
        texto,
        imagen: imagenBase64,
        autorNombre: currentUser.nombre,
        fecha: Date.now(),
        leidoPor: { [currentUser.id]: true },
      });
      await addBitacora({
        miembroId: currentUser.id,
        miembroNombre: currentUser.nombre,
        accion: "aviso_publicado",
        detalle: texto.slice(0, 60),
        fecha: Date.now(),
      });
      input.value = "";
      eliminarBtn.click();
      compartirWrap.hidden = false;
    });
    container.querySelector("#aviso-wa").addEventListener("click", () => {
      const { config } = getState();
      window.open(buildWhatsappUrl(buildAvisoMensaje(config)), "_blank");
    });
  }

  repaint();
  return subscribe(repaint);
}
