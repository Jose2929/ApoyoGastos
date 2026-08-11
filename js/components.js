import { formatMoney, formatFecha, escapeHtml } from "./utils.js";

export function movementRow(id, m, { onEdit } = {}) {
  const row = document.createElement("div");
  const isDep = m.tipo === "deposito";
  row.className = "movement-row";
  const detalle = !isDep && m.categoria ? ` · ${escapeHtml(m.categoria)}` : "";
  const comentario = m.comentario ? ` — ${escapeHtml(m.comentario)}` : "";
  row.innerHTML = `
    <span class="movement-icon ${isDep ? "icon-deposit" : "icon-expense"}">${isDep ? "↑" : "↓"}</span>
    <span class="movement-info">
      <span class="movement-who">${escapeHtml(m.miembroNombre)}${detalle}${comentario}</span>
      <span class="movement-when">${formatFecha(m.fecha)}</span>
    </span>
    <span class="movement-amount ${isDep ? "amount-deposit" : "amount-expense"}">${isDep ? "+" : "−"} ${formatMoney(m.monto)}</span>
    ${onEdit ? '<button type="button" class="btn-edit-icon" aria-label="Corregir movimiento">✏️</button>' : ""}
  `;
  if (onEdit) {
    row.querySelector(".btn-edit-icon").addEventListener("click", () => onEdit(id, m));
  }
  return row;
}
