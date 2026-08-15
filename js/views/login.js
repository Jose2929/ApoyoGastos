import { getState, subscribe } from "../state.js";
import { addBitacora, updateMiembro } from "../db.js";
import { renderPinpad } from "../pinpad.js";
import { saveSession } from "../session.js";
import { escapeHtml } from "../utils.js";

const LAST_USER_KEY = "apoyoGastos_lastUser";

export function render(container) {
  container.innerHTML = `
    <div class="login-screen">
      <p class="subtitle" id="login-subtitle">Busca tu nombre para acceder</p>
      <div class="member-list"></div>
      <div class="pin-area" hidden></div>
    </div>
  `;

  const subtitle = container.querySelector("#login-subtitle");
  const list = container.querySelector(".member-list");
  const pinArea = container.querySelector(".pin-area");

  function paintList() {
    const { miembros } = getState();
    let activos = Object.entries(miembros).filter(([, m]) => m.activo !== false);

    const lastId = localStorage.getItem(LAST_USER_KEY);
    activos.sort((a, b) => {
      if (a[0] === lastId) return -1;
      if (b[0] === lastId) return 1;
      return a[1].nombre.localeCompare(b[1].nombre, "es");
    });

    list.innerHTML = "";
    if (!activos.length) {
      list.innerHTML = '<p class="empty">Todavía no hay integrantes registrados. Pide al administrador que te agregue.</p>';
      return;
    }

    activos.forEach(([id, m]) => {
      const btn = document.createElement("button");
      btn.className = "btn btn-big member-btn";
      if (id === lastId) {
        btn.classList.add("member-btn-last");
        btn.innerHTML = `<span class="member-star" aria-hidden="true">⭐</span>${escapeHtml(m.nombre)}`;
      } else {
        btn.textContent = m.nombre;
      }
      btn.addEventListener("click", () => {
        if (!m.pin) {
          completeLogin(id, m);
        } else {
          openPin(id, m);
        }
      });
      list.appendChild(btn);
    });
  }

  function openPin(id, m) {
    list.hidden = true;
    pinArea.hidden = false;
    pinArea.innerHTML = "";
    subtitle.textContent = `Bienvenid@ de vuelta, ${m.nombre}`;

    const pinHost = document.createElement("div");
    pinArea.appendChild(pinHost);

    renderPinpad(pinHost, {
      title: `PIN de ${m.nombre}`,
      onComplete: (pin, ctrl) => {
        if (pin !== m.pin) {
          ctrl.showError("PIN incorrecto, intenta de nuevo");
          return;
        }
        if (m.debePreguntarPin) {
          showCambiarPinPrompt(id, m);
        } else {
          completeLogin(id, m);
        }
      },
    });

    const back = document.createElement("button");
    back.className = "btn btn-big btn-secondary";
    back.textContent = "Soy otra persona";
    back.addEventListener("click", () => {
      pinArea.hidden = true;
      pinArea.innerHTML = "";
      list.hidden = false;
      subtitle.textContent = "Busca tu nombre para acceder";
    });
    pinArea.appendChild(back);
  }

  function showCambiarPinPrompt(id, m) {
    pinArea.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "first-login-screen";
    wrap.innerHTML = `
      <h2>¿Quieres cambiar tu PIN?</h2>
      <p>Puedes dejar el mismo o elegir uno nuevo, ${escapeHtml(m.nombre)}.</p>
      <button class="btn btn-big" id="btn-si-cambiar">Sí, cambiarlo</button>
      <button class="btn btn-big btn-secondary" id="btn-no-cambiar">No, continuar con el mismo</button>
    `;
    pinArea.appendChild(wrap);

    wrap.querySelector("#btn-no-cambiar").addEventListener("click", async () => {
      await updateMiembro(id, { debePreguntarPin: false });
      completeLogin(id, m, { detalle: "" });
    });

    wrap.querySelector("#btn-si-cambiar").addEventListener("click", () => {
      wrap.innerHTML = "";
      const host = document.createElement("div");
      wrap.appendChild(host);
      renderPinpad(host, {
        title: "Elige tu nuevo PIN",
        onComplete: async (nuevoPin) => {
          await updateMiembro(id, { pin: nuevoPin, debePreguntarPin: false });
          completeLogin(id, m, { detalle: "cambió su PIN al entrar" });
        },
      });
    });
  }

  function completeLogin(id, m, { detalle = "" } = {}) {
    localStorage.setItem(LAST_USER_KEY, id);
    saveSession({ id, nombre: m.nombre, rol: m.rol || "normal" });
    addBitacora({
      miembroId: id,
      miembroNombre: m.nombre,
      accion: "login",
      detalle,
      fecha: Date.now(),
    });
  }

  paintList();
  return subscribe(() => {
    if (list.hidden) return;
    paintList();
  });
}
