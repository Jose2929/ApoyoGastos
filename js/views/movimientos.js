import { getState, subscribe } from "../state.js";
import { monthKey, monthLabel } from "../utils.js";
import { movementRow } from "../components.js";
import { openMovementEditModal } from "../movementEdit.js";

export function render(container, { simple = false } = {}) {
  const { miembros, currentUser } = getState();
  const isAdmin = currentUser?.rol === "admin";

  let filtroTipo = "todo";
  let filtroIntegrante = "todos";
  let filtroMes = "todos";

  container.innerHTML = `
    <div class="list-screen">
      <h1>${simple ? "Historial" : "Resumen general"}</h1>
      <div class="filter-pills" id="filtro-tipo">
        <button class="pill selected" data-v="todo">Todo</button>
        <button class="pill" data-v="deposito">Depósitos</button>
        <button class="pill" data-v="gasto">Gastos</button>
      </div>
      ${
        !simple
          ? `
        <div class="filter-row">
          <select id="filtro-integrante" class="input-select">
            <option value="todos">Todos los integrantes</option>
            ${Object.entries(miembros)
              .map(([id, m]) => `<option value="${id}">${m.nombre}</option>`)
              .join("")}
          </select>
          <select id="filtro-mes" class="input-select">
            <option value="todos">Todos los meses</option>
          </select>
        </div>`
          : ""
      }
      <div class="movement-list" id="lista"></div>
    </div>
  `;

  const listaEl = container.querySelector("#lista");
  const mesSelect = !simple ? container.querySelector("#filtro-mes") : null;
  let mesesRenderizados = "";

  function aplicarFiltros() {
    const { movimientos } = getState();
    let items = Object.entries(movimientos).sort((a, b) => b[1].fecha - a[1].fecha);

    if (!simple && mesSelect) {
      const meses = [...new Set(items.map(([, m]) => monthKey(m.fecha)))].sort().reverse();
      const key = meses.join(",");
      if (key !== mesesRenderizados) {
        mesesRenderizados = key;
        const prevValue = mesSelect.value;
        mesSelect.innerHTML =
          '<option value="todos">Todos los meses</option>' +
          meses.map((k) => `<option value="${k}">${monthLabel(k)}</option>`).join("");
        mesSelect.value = meses.includes(prevValue) ? prevValue : "todos";
        filtroMes = mesSelect.value;
      }
    }

    if (filtroTipo !== "todo") items = items.filter(([, m]) => m.tipo === filtroTipo);
    if (!simple && filtroIntegrante !== "todos") items = items.filter(([, m]) => m.miembroId === filtroIntegrante);
    if (!simple && filtroMes !== "todos") items = items.filter(([, m]) => monthKey(m.fecha) === filtroMes);

    listaEl.innerHTML = "";
    if (!items.length) {
      listaEl.innerHTML = '<p class="empty">No hay movimientos con este filtro.</p>';
      return;
    }
    items.forEach(([id, m]) =>
      listaEl.appendChild(movementRow(id, m, { onEdit: isAdmin ? openMovementEditModal : null }))
    );
  }

  container.querySelectorAll("#filtro-tipo .pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      container.querySelectorAll("#filtro-tipo .pill").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      filtroTipo = btn.dataset.v;
      aplicarFiltros();
    });
  });

  if (!simple) {
    container.querySelector("#filtro-integrante").addEventListener("change", (e) => {
      filtroIntegrante = e.target.value;
      aplicarFiltros();
    });
    mesSelect.addEventListener("change", (e) => {
      filtroMes = e.target.value;
      aplicarFiltros();
    });
  }

  aplicarFiltros();
  return subscribe(aplicarFiltros);
}
