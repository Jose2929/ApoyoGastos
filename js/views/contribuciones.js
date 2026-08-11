import { getState, subscribe } from "../state.js";
import { formatMoney, monthKey, monthLabel, escapeHtml } from "../utils.js";

const LABELS = {
  al_corriente: "Al corriente",
  falta: "Falta por aportar",
  extra: "Aportó de más",
  sin_meta: "Sin meta configurada",
};

export function render(container) {
  const actual = monthKey(Date.now());
  let mesSel = actual;
  let filtroEstado = "todos";

  container.innerHTML = `
    <div class="list-screen">
      <h1>Contribuciones</h1>
      <select id="mes-select" class="input-select"></select>
      <div class="filter-pills" id="filtro-estado">
        <button class="pill selected" data-v="todos">Todos</button>
        <button class="pill" data-v="al_corriente">Al corriente</button>
        <button class="pill" data-v="falta">Faltan por aportar</button>
        <button class="pill" data-v="extra">Aportaron de más</button>
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
    const meta = config?.metaMensual || 0;

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
      ? `Meta mensual: ${formatMoney(meta)}`
      : "El administrador aún no configura la meta mensual.";

    const activos = Object.entries(miembros).filter(([, m]) => m.activo !== false);
    let items = activos.map(([id, m]) => {
      const suma = Object.values(movimientos)
        .filter((mv) => mv.tipo === "deposito" && mv.miembroId === id && monthKey(mv.fecha) === mesSel)
        .reduce((a, mv) => a + mv.monto, 0);
      let estado;
      if (!meta) estado = "sin_meta";
      else if (suma > meta) estado = "extra";
      else if (suma === meta) estado = "al_corriente";
      else estado = "falta";
      return { nombre: m.nombre, suma, estado };
    });

    if (filtroEstado !== "todos") items = items.filter((i) => i.estado === filtroEstado);
    items.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

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
