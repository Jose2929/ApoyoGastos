import { getState, subscribe } from "../state.js";
import { switchView } from "../router.js";
import { formatMoney, monthKey } from "../utils.js";
import { movementRow } from "../components.js";
import { openMovementEditModal } from "../movementEdit.js";

export function render(container) {
  const { currentUser } = getState();
  const puedeGasto = currentUser?.rol === "admin" || currentUser?.rol === "gestor";

  container.innerHTML = `
    <div class="home-screen">
      <p class="hello" id="hello"></p>
      <div class="total-card">
        <span class="total-label">Total disponible</span>
        <span class="total-amount" id="total-amount"></span>
      </div>
      <div class="stats-row" id="stats-row" hidden></div>
      <div class="action-buttons ${puedeGasto ? "" : "single"}">
        <button class="btn btn-big btn-deposit" id="btn-deposito">+ Depósito</button>
        ${puedeGasto ? '<button class="btn btn-big btn-expense" id="btn-gasto">− Gasto</button>' : ""}
      </div>
      <h2 class="section-title">Movimientos recientes</h2>
      <div class="movement-list" id="movement-list"></div>
      <button class="btn btn-secondary" id="btn-historial">Ver historial completo</button>
    </div>
  `;

  container.querySelector("#btn-deposito").addEventListener("click", () =>
    switchView("movimiento", { tipo: "deposito" })
  );
  if (puedeGasto) {
    container.querySelector("#btn-gasto").addEventListener("click", () =>
      switchView("movimiento", { tipo: "gasto" })
    );
  }
  container.querySelector("#btn-historial").addEventListener("click", () =>
    switchView("movimientos", { simple: true })
  );

  function repaint() {
    const { movimientos, config, currentUser } = getState();
    const isAdmin = currentUser?.rol === "admin";
    container.querySelector("#hello").textContent = `Hola, ${currentUser?.nombre ?? ""}`;

    const lista = Object.entries(movimientos).sort((a, b) => b[1].fecha - a[1].fecha);
    const total = lista.reduce(
      (acc, [, m]) => acc + (m.tipo === "deposito" ? m.monto : -m.monto),
      0
    );
    container.querySelector("#total-amount").textContent = formatMoney(total);

    const statsRow = container.querySelector("#stats-row");
    const metaMensual = config?.metaMensual || 0;
    if (metaMensual > 0) {
      const mesActual = monthKey(Date.now());
      const recaudadoMes = lista.reduce(
        (acc, [, m]) =>
          acc + (m.tipo === "deposito" && monthKey(m.fecha) === mesActual ? m.monto : 0),
        0
      );
      const faltante = Math.max(0, metaMensual - recaudadoMes);
      statsRow.hidden = false;
      statsRow.innerHTML = `
        <div class="stat-card">
          <span class="stat-label">Meta del mes</span>
          <span class="stat-amount">${formatMoney(metaMensual)}</span>
        </div>
        <div class="stat-card">
          <span class="stat-label">Faltante</span>
          <span class="stat-amount ${faltante > 0 ? "stat-warn" : "stat-ok"}">${
        faltante > 0 ? formatMoney(faltante) : "¡Completa! 🎉"
      }</span>
        </div>
      `;
    } else {
      statsRow.hidden = true;
      statsRow.innerHTML = "";
    }

    const listEl = container.querySelector("#movement-list");
    listEl.innerHTML = "";
    if (!lista.length) {
      listEl.innerHTML = '<p class="empty">Todavía no hay movimientos.</p>';
    } else {
      lista
        .slice(0, 8)
        .forEach(([id, m]) =>
          listEl.appendChild(movementRow(id, m, { onEdit: isAdmin ? openMovementEditModal : null }))
        );
    }
  }

  repaint();
  return subscribe(repaint);
}
