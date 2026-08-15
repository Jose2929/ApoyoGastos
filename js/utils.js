import { DEFAULT_AVISO_TEXTO, DEFAULT_DEPOSITO_TEXTO } from "./constants.js";

export function buildWhatsappUrl(text) {
  return "https://wa.me/?text=" + encodeURIComponent(text);
}

export function buildAvisoMensaje(config) {
  const base = (config && config.whatsappAvisoTexto) || DEFAULT_AVISO_TEXTO;
  const link = config && config.appUrl ? " " + config.appUrl : "";
  return base + link;
}

export function buildDepositoMensaje(config, montoFormateado) {
  const base = (config && config.whatsappDepositoTexto) || DEFAULT_DEPOSITO_TEXTO;
  const link = config && config.appUrl ? " " + config.appUrl : "";
  return base.replace("{monto}", montoFormateado) + link;
}

export function formatMoney(n) {
  return (Number(n) || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

export function formatFecha(millis) {
  return new Date(millis).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function monthKey(millis) {
  const d = new Date(millis);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function sumaDepositosMes(movimientos, miembroId, mesKey) {
  return Object.values(movimientos).reduce(
    (acc, mv) =>
      acc + (mv.tipo === "deposito" && mv.miembroId === miembroId && monthKey(mv.fecha) === mesKey ? mv.monto : 0),
    0
  );
}

export function monthLabel(key) {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

export function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function base64Bytes(dataUrl) {
  if (!dataUrl) return 0;
  const idx = dataUrl.indexOf(",");
  const b64 = idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
  return Math.ceil((b64.length * 3) / 4);
}

export function compressImageToBase64(file, opts = {}) {
  const { maxDim = 900, targetBytes = 80000, minQuality = 0.3 } = opts;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo leer la imagen"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          } else {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.6;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        while (base64Bytes(dataUrl) > targetBytes && quality > minQuality) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
