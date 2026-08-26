/**
 * Guest / demo mode. Lets testers and judges explore the full experience
 * without creating an account. Everything stays on this device only.
 */
const KEY = "vela.guest.v1";

export function isGuest(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "1";
}

export function startGuest() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, "1");
}

export function endGuest() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}
