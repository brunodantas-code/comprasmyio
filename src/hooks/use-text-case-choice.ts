import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const fallback = new Map<string, boolean>();
export function readTextCaseChoice(storage: Pick<Storage, "getItem">, scope: string) {
  return storage.getItem(`myio:text-case:${scope}`) === "true";
}
export function writeTextCaseChoice(storage: Pick<Storage, "setItem">, scope: string, enabled: boolean) {
  storage.setItem(`myio:text-case:${scope}`, String(enabled));
}
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
};

export function useTextCaseChoice(scope: string): [boolean, (enabled: boolean) => void] {
  const key = `myio:text-case:${scope}`;
  const enabled = useSyncExternalStore(subscribe, () => {
    try { return readTextCaseChoice(localStorage, scope); } catch { return fallback.get(key) ?? false; }
  }, () => false);
  return [enabled, (next) => {
    fallback.set(key, next);
    try { writeTextCaseChoice(localStorage, scope, next); } catch { /* Keep the choice for this session. */ }
    listeners.forEach(listener => listener());
  }];
}