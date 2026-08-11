const KEY = "apoyoGastos_session";

export function saveSession(user) {
  sessionStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new CustomEvent("session-changed", { detail: user }));
}

export function loadSession() {
  const raw = sessionStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : null;
}

export function clearSession() {
  sessionStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("session-changed", { detail: null }));
}
