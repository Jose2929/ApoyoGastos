import { getState, subscribe } from "../state.js";
import { switchView } from "../router.js";
import { formatMoney, monthKey, sumaDepositosMes } from "../utils.js";

export function render(container) {
  const { currentUser } = getState();
  const puedeGasto = currentUser?.rol === "admin" || currentUser?.rol === "gestor";

  container.innerHTML = `
    <div class="home-screen">
      <p class="hello" id="hello"></p>

      <div class="home-section home-section-shaded">
        <div class="total-card">
          <span class="total-label">Total en la cuenta común</span>
          <span class="total-amount" id="total-amount"></span>
        </div>
        <p class="field-hint">Este monto es dinero real y disponible en la cuenta común ahora mismo.</p>

        <div class="action-buttons ${puedeGasto ? "" : "single"}">
          <button class="btn btn-big btn-deposit" id="btn-deposito">+ Depósito</button>
          ${puedeGasto ? '<button class="btn btn-big btn-expense" id="btn-gasto">− Gasto</button>' : ""}
        </div>
      </div>

      <div class="home-section">
        <h2 class="section-title">Meta del mes</h2>
        <div class="stats-row" id="stats-row" hidden></div>
        <p class="field-hint" id="meta-hint" hidden></p>
        <h3 class="section-subtitle" id="aportes-subtitle" hidden>¿Quién ya aportó?</h3>
        <div class="stats-row cols-3" id="stats-row-aportes" hidden></div>
      </div>

      <div class="home-section home-section-shaded">
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
        <p class="field-hint">Esto es lo que en verdad ha entrado y salido del fondo. El total cambia según cuánto se aporte y se gaste.</p>
        <button class="btn btn-secondary" id="btn-ver-movimientos">Ver movimientos</button>
      </div>
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
    const metaHint = container.querySelector("#meta-hint");
    const aportesSubtitle = container.querySelector("#aportes-subtitle");
    const statsRowAportes = container.querySelector("#stats-row-aportes");
    const metaPorIntegrante = config?.metaPorIntegrante || 0;
    const activos = Object.entries(miembros).filter(([, m]) => m.activo !== false);
    const activosCount = activos.length;
    const metaMensual = metaPorIntegrante * activosCount;

    if (metaMensual > 0) {
      const mesActual = monthKey(Date.now());
      const recaudadoMes = activos.reduce(
        (acc, [id]) => acc + Math.min(sumaDepositosMes(movimientos, id, mesActual), metaPorIntegrante),
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
        faltante > 0 ? `⏳ ${formatMoney(faltante)}` : "¡Completa! 🎉"
      }</span>
        </div>
      `;

      metaHint.hidden = false;
      metaHint.textContent =
        "Es la suma de lo que le corresponde aportar a cada integrante este mes. Si alguien aporta de más, ese excedente no aumenta esta meta, pero igual se suma al fondo común.";

      let faltaCount = 0;
      let alCorrienteCount = 0;
      let extraCount = 0;
      activos.forEach(([id]) => {
        const suma = sumaDepositosMes(movimientos, id, mesActual);
        if (suma > metaPorIntegrante) extraCount++;
        else if (suma === metaPorIntegrante) alCorrienteCount++;
        else faltaCount++;
      });

      aportesSubtitle.hidden = false;
      statsRowAportes.hidden = false;
      statsRowAportes.innerHTML = `
        <button type="button" class="stat-card" id="stat-falta">
          <span class="stat-label">Faltan</span>
          <span class="stat-amount stat-warn">${faltaCount}</span>
        </button>
        <button type="button" class="stat-card" id="stat-al-corriente">
          <span class="stat-label">Ya aportaron</span>
          <span class="stat-amount stat-ok">${alCorrienteCount}</span>
        </button>
        <button type="button" class="stat-card" id="stat-extra">
          <span class="stat-label">Aportaron de más</span>
          <span class="stat-amount stat-extra">${extraCount}</span>
        </button>
      `;
      statsRowAportes.querySelector("#stat-falta").addEventListener("click", () =>
        switchView("contribuciones", { filtro: "falta" })
      );
      statsRowAportes.querySelector("#stat-al-corriente").addEventListener("click", () =>
        switchView("contribuciones", { filtro: "al_corriente" })
      );
      statsRowAportes.querySelector("#stat-extra").addEventListener("click", () =>
        switchView("contribuciones", { filtro: "extra" })
      );
    } else {
      statsRow.hidden = true;
      statsRow.innerHTML = "";
      metaHint.hidden = true;
      aportesSubtitle.hidden = true;
      statsRowAportes.hidden = true;
      statsRowAportes.innerHTML = "";
    }
  }

  repaint();
  return subscribe(repaint);
}
