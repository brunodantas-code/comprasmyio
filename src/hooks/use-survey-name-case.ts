import { useSyncExternalStore } from "react";

// Presentation-only, visit-scoped state shared by registration and report buttons.
const choices = new Map<string, boolean>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const serverSnapshot = () => false;

export function useSurveyNameCase(visitId: string): [boolean, (enabled: boolean) => void] {
  const enabled = useSyncExternalStore(subscribe, () => choices.get(visitId) ?? false, serverSnapshot);
  const setEnabled = (next: boolean) => {
    choices.set(visitId, next);
    listeners.forEach(listener => listener());
  };
  return [enabled, setEnabled];
}