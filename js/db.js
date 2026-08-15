import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase, ref, onValue, push, set, update, get,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const ROOT = "apoyoGastos";

export function listenMiembros(cb) {
  onValue(ref(db, `${ROOT}/miembros`), (snap) => cb(snap.val() || {}));
}

export function listenMovimientos(cb) {
  onValue(ref(db, `${ROOT}/movimientos`), (snap) => cb(snap.val() || {}));
}

export function listenAvisos(cb) {
  onValue(ref(db, `${ROOT}/avisos`), (snap) => cb(snap.val() || {}));
}

export function listenConfig(cb) {
  onValue(ref(db, `${ROOT}/config`), (snap) => cb(snap.val() || { metaPorIntegrante: 0 }));
}

export async function loadBitacora() {
  const snap = await get(ref(db, `${ROOT}/bitacora`));
  return snap.val() || {};
}

export async function addMovimiento(data) {
  const r = push(ref(db, `${ROOT}/movimientos`));
  await set(r, data);
  return r.key;
}

export async function addMiembro(data) {
  const r = push(ref(db, `${ROOT}/miembros`));
  await set(r, data);
  return r.key;
}

export function updateMiembro(id, patch) {
  return update(ref(db, `${ROOT}/miembros/${id}`), patch);
}

export function updateMovimiento(id, patch) {
  return update(ref(db, `${ROOT}/movimientos/${id}`), patch);
}

export function marcarAvisoLeido(avisoId, miembroId) {
  return update(ref(db, `${ROOT}/avisos/${avisoId}/leidoPor`), { [miembroId]: true });
}

export function addAviso(data) {
  const r = push(ref(db, `${ROOT}/avisos`));
  return set(r, data);
}

export function addBitacora(data) {
  const r = push(ref(db, `${ROOT}/bitacora`));
  return set(r, data);
}

export function setConfig(patch) {
  return update(ref(db, `${ROOT}/config`), patch);
}

export async function purgeComprobantesAntiguos(antesDeMillis) {
  const snap = await get(ref(db, `${ROOT}/movimientos`));
  const movimientos = snap.val() || {};
  const updates = {};
  let bytesLiberados = 0;
  for (const [id, m] of Object.entries(movimientos)) {
    if (m.comprobante && m.fecha < antesDeMillis) {
      bytesLiberados += Math.ceil((m.comprobante.length * 3) / 4);
      updates[`${ROOT}/movimientos/${id}/comprobante`] = null;
    }
  }
  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
  return bytesLiberados;
}
