import { getState, subscribe } from "../state.js";
import { addAviso, addBitacora } from "../db.js";
import { formatFecha, escapeHtml, buildWhatsappUrl, buildAvisoMensaje } from "../utils.js";

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
      const el = document.createElement("div");
      el.className = "aviso-card";
      el.innerHTML = `
        <p class="aviso-texto">${escapeHtml(a.texto)}</p>
        <p class="aviso-meta">${escapeHtml(a.autorNombre)} · ${formatFecha(a.fecha)}</p>
      `;
      listaEl.appendChild(el);
    });
  }

  if (puedePublicar) {
    const compartirWrap = container.querySelector("#aviso-compartir");
    container.querySelector("#aviso-publicar").addEventListener("click", async () => {
      const input = container.querySelector("#aviso-texto");
      const texto = input.value.trim();
      if (!texto) return;
      await addAviso({
        texto,
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
