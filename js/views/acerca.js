import { getState, subscribe } from "../state.js";
import { DEFAULT_ACERCA_TEXTO } from "../constants.js";
import { escapeHtml } from "../utils.js";

export function render(container) {
  function repaint() {
    const { config } = getState();
    const texto = config?.acercaTexto || DEFAULT_ACERCA_TEXTO;
    const parrafos = texto
      .split("\n\n")
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("");
    container.innerHTML = `
      <div class="list-screen about-screen">
        <h1>Acerca de esta app</h1>
        ${parrafos}
      </div>
    `;
  }

  repaint();
  return subscribe(repaint);
}
