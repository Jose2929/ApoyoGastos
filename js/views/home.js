import { getState, subscribe } from "../state.js";
import { switchView } from "../router.js";
import { formatMoney, monthKey, sumaDepositosMes } from "../utils.js";

export function render(container) {
  const { currentUser } = getState();
  const puedeGasto = currentUser?.rol === "admin" || currentUser?.rol === "gestor";

  container.innerHTML = `
    <div class="home-screen">
      <p class="hello" id="hello"></p>
      <div class="total-card">
        <span class="total-label">Total en la cuenta común</span>
        <span class="total-amount" id="total-amount"></span>
      </div>
      <div class="action-buttons ${puedeGasto ? "" : "single"}">
        <button class="btn btn-big btn-deposit" id="btn-deposito">+ Depósito</button>
        ${puedeGasto ? '<button class="btn btn-big btn-expense" id="btn-gasto">− Gasto</button>' : ""}
      </div>

      <h2 class="section-title">Meta del mes</h2>
      <div class="stats-row" id="stats-row" hidden></div>
      <div id="faltantes-wrap"></div>

      <h2 class="section-title">Movimientos</h2>
      <div class="stats-row">
        <button type="button" class="stat-card" id="stat-depositos">
          <span class="stat-label">Depósitos</span>
          <span class="stat-amount amount-deposit" id="total-depositos"></span>
        </button>
        <button type="button" class="stat-card" id="stat-gastos">
          <span class="stat-label">Gastos</span>
          <span class="stat-amount amount-expense" id="total-gastos"></span>
        </button>
      </div>
      <button class="btn btn-secondary" id="btn-ver-movimientos">Ver movimientos</button>
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
  container.querySelector("#stat-depositos").addEventListener("click", () =>
    switchView("movimientos", { simple: true, tipo: "deposito" })
  );
  container.querySelector("#stat-gastos").addEventListener("click", () =>
    switchView("movimientos", { simple: true, tipo: "gasto" })
  );
  container.querySelector("#btn-ver-movimientos").addEventListener("click", () =>
    switchView("movimientos", { simple: true })
  );

  function repaint() {
    const { movimientos, miembros, config, currentUser } = getState();
    container.querySelector("#hello").textContent = `Hola, ${currentUser?.nombre ?? ""}`;

    const lista = Object.entries(movimientos).sort((a, b) => b[1].fecha - a[1].fecha);
    const totalDepositos = lista.reduce((acc, [, m]) => acc + (m.tipo === "deposito" ? m.monto : 0), 0);
    const totalGastos = lista.reduce((acc, [, m]) => acc + (m.tipo === "gasto" ? m.monto : 0), 0);
    container.querySelector("#total-amount").textContent = formatMoney(totalDepositos - totalGastos);
    container.querySelector("#total-depositos").textContent = formatMoney(totalDepositos);
    container.querySelector("#total-gastos").textContent = formatMoney(totalGastos);

    const statsRow = container.querySelector("#stats-row");
    const faltantesWrap = container.querySelector("#faltantes-wrap");
    const metaPorIntegrante = config?.metaPorIntegrante || 0;
    const activosCount = Object.values(miembros).filter((m) => m.activo !== false).length;
    const metaMensual = metaPorIntegrante * activosCount;

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

      const faltantesCount = Object.entries(miembros).filter(([id, m]) => {
        if (m.activo === false) return false;
        return sumaDepositosMes(movimientos, id, mesActual) < metaPorIntegrante;
      }).length;

      faltantesWrap.innerHTML =
        faltantesCount > 0
          ? `<button type="button" class="alert-banner" id="btn-faltantes"><span class="alert-icon" aria-hidden="true">⚠️</span><span>Aún falta aportar ${faltantesCount} persona${faltantesCount === 1 ? "" : "s"}</span></button>`
          : "";
      if (faltantesCount > 0) {
        faltantesWrap.querySelector("#btn-faltantes").addEventListener("click", () =>
          switchView("contribuciones", { filtro: "falta" })
        );
      }
    } else {
      statsRow.hidden = true;
      statsRow.innerHTML = "";
      faltantesWrap.innerHTML = "";
    }
  }

  repaint();
  return subscribe(repaint);
}
