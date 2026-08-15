import { getState, subscribe } from "../state.js";
import { formatMoney, monthKey, monthLabel, escapeHtml, sumaDepositosMes } from "../utils.js";

const LABELS = {
  al_corriente: "Ya aportó",
  falta: "Falta por aportar",
  extra: "Aportó de más",
  sin_meta: "Sin meta configurada",
};

const ESTADO_ORDEN = { extra: 0, al_corriente: 1, falta: 2, sin_meta: 3 };

export function render(container, { filtro = "todos" } = {}) {
  const actual = monthKey(Date.now());
  let mesSel = actual;
  let filtroEstado = filtro;

  container.innerHTML = `
    <div class="list-screen">
      <h1>Contribuciones</h1>
      <select id="mes-select" class="input-select"></select>
      <div class="filter-pills" id="filtro-estado">
        <button class="pill ${filtroEstado === "todos" ? "selected" : ""}" data-v="todos">Todos</button>
        <button class="pill ${filtroEstado === "al_corriente" ? "selected" : ""}" data-v="al_corriente">Ya aportaron</button>
        <button class="pill ${filtroEstado === "falta" ? "selected" : ""}" data-v="falta">Faltan por aportar</button>
        <button class="pill ${filtroEstado === "extra" ? "selected" : ""}" data-v="extra">Aportaron de más</button>
      </div>
      <p class="meta-info" id="meta-info"></p>
      <div class="member-status-list" id="lista"></div>
    </div>
  `;

  const mesSelectEl = container.querySelector("#mes-select");
  const listaEl = container.querySelector("#lista");
  const metaInfoEl = container.querySelector("#meta-info");
  let mesesRenderizados = "";

  function repaint() {
    const { movimientos, miembros, config } = getState();
    const meta = config?.metaPorIntegrante || 0;
    const activosCount = Object.values(miembros).filter((m) => m.activo !== false).length;
    const metaTotal = meta * activosCount;

    const meses = new Set(Object.values(movimientos).map((m) => monthKey(m.fecha)));
    meses.add(actual);
    const mesesOrdenados = [...meses].sort().reverse();
    const key = mesesOrdenados.join(",");
    if (key !== mesesRenderizados) {
      mesesRenderizados = key;
      const prevValue = mesSelectEl.value || mesSel;
      mesSelectEl.innerHTML = mesesOrdenados
        .map((k) => `<option value="${k}">${monthLabel(k)}</option>`)
        .join("");
      mesSelectEl.value = mesesOrdenados.includes(prevValue) ? prevValue : actual;
      mesSel = mesSelectEl.value;
    }

    metaInfoEl.textContent = meta
      ? `Meta total del mes: ${formatMoney(metaTotal)} · Por integrante: ${formatMoney(meta)}`
      : "Aún no hay una meta para este mes.";

    const activos = Object.entries(miembros).filter(([, m]) => m.activo !== false);
    let items = activos.map(([id, m]) => {
      const suma = sumaDepositosMes(movimientos, id, mesSel);
      let estado;
      if (!meta) estado = "sin_meta";
      else if (suma > meta) estado = "extra";
      else if (suma === meta) estado = "al_corriente";
      else estado = "falta";
      return { nombre: m.nombre, suma, estado };
    });

    if (filtroEstado !== "todos") items = items.filter((i) => i.estado === filtroEstado);
    items.sort((a, b) => {
      const diff = ESTADO_ORDEN[a.estado] - ESTADO_ORDEN[b.estado];
      return diff !== 0 ? diff : a.nombre.localeCompare(b.nombre, "es");
    });

    listaEl.innerHTML = "";
    if (!items.length) {
      listaEl.innerHTML = '<p class="empty">Nadie en este filtro.</p>';
      return;
    }
    items.forEach((i) => listaEl.appendChild(statusRow(i, meta)));
  }

  mesSelectEl.addEventListener("change", (e) => {
    mesSel = e.target.value;
    repaint();
  });

  container.querySelectorAll("#filtro-estado .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll("#filtro-estado .pill").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      filtroEstado = btn.dataset.v;
      repaint();
    });
  });

  repaint();
  return subscribe(repaint);
}

function statusRow({ nombre, suma, estado }, meta) {
  const row = document.createElement("div");
  row.className = "status-row status-" + estado;
  row.innerHTML = `
    <span class="status-name">${escapeHtml(nombre)}</span>
    <span class="status-amount">${formatMoney(suma)}</span>
    <span class="status-badge">${LABELS[estado] || ""}</span>
    ${
      estado === "extra"
        ? `<span class="status-thanks">¡Gracias por aportar ${formatMoney(suma - meta)} de más! 🙏</span>`
        : ""
    }
  `;
  return row;
}
