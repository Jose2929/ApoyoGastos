export function renderPinpad(container, { onComplete, length = 4, title } = {}) {
  let value = "";
  container.innerHTML = `
    <div class="pinpad">
      ${title ? `<p class="pinpad-title"></p>` : ""}
      <div class="pinpad-dots"></div>
      <div class="pinpad-grid"></div>
      <p class="pinpad-error" hidden></p>
    </div>
  `;

  if (title) container.querySelector(".pinpad-title").textContent = title;

  const dotsEl = container.querySelector(".pinpad-dots");
  for (let i = 0; i < length; i++) {
    const dot = document.createElement("span");
    dot.className = "dot";
    dotsEl.appendChild(dot);
  }
  const dots = container.querySelectorAll(".dot");
  const grid = container.querySelector(".pinpad-grid");
  const errorEl = container.querySelector(".pinpad-error");

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];
  keys.forEach((k) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pinpad-key" + (k === "" ? " invisible" : "");
    btn.textContent = k;
    if (k !== "") {
      btn.addEventListener("click", () => {
        errorEl.hidden = true;
        if (k === "⌫") {
          value = value.slice(0, -1);
        } else if (value.length < length) {
          value += k;
        }
        updateDots();
        if (value.length === length) {
          const submitted = value;
          onComplete(submitted, {
            showError(msg) {
              errorEl.textContent = msg || "PIN incorrecto";
              errorEl.hidden = false;
              value = "";
              updateDots();
            },
            reset() {
              value = "";
              updateDots();
            },
          });
        }
      });
    }
    grid.appendChild(btn);
  });

  function updateDots() {
    dots.forEach((d, i) => d.classList.toggle("filled", i < value.length));
  }
}
