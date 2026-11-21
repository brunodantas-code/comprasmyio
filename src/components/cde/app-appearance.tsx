import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { APP_APPEARANCE_GROUP, convertAppearanceColor, parseAppAppearance, type AppAppearance } from "./appearance-colors";

export const APP_APPEARANCE_QUERY = ["cde-app-appearance"];
export function useAppAppearance() {
  return useQuery({ queryKey: APP_APPEARANCE_QUERY, refetchInterval: 30_000, queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key")
      .eq("group_key", APP_APPEARANCE_GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseAppAppearance(data?.variant_key);
  } });
}

/** Reversible display overlay; no saved customization or attachment pixels are changed. */
export function mountAppAppearance(appearance: AppAppearance) {
  const root = document.documentElement;
  const sheet = document.createElement("style");
  sheet.dataset['appAppearance'] = appearance;
  const probe = document.createElement("span");
  probe.hidden = true;
  document.head.append(sheet);
  document.body.append(probe);
  const resolve = (value: string) => {
    probe.style.color = "";
    probe.style.color = value;
    return probe.style.color ? getComputedStyle(probe).color : value;
  };
  const refreshTokens = () => {
    sheet.textContent = "";
    const styles = getComputedStyle(root);
    const rules: string[] = [];
    for (const name of styles) {
      if (!name.startsWith("--") || name.startsWith("--appearance-reference")) continue;
      const original = styles.getPropertyValue(name).trim();
      if (!original || !CSS.supports("color", original)) continue;
      const converted = appearance === "purple" && ["--primary-foreground", "--sidebar-primary-foreground"].includes(name)
        ? "oklch(1 0 0)" : convertAppearanceColor(resolve(original), appearance);
      rules.push(`${name}:${converted} !important`);
    }
    sheet.textContent = `:root{${rules.join(";")}}`;
  };
  refreshTokens();
  const originals = new Map<Element, Map<string, { source: string; output: string }>>();
  const properties = ["color", "background-color", "border-color", "border-top-color", "border-right-color", "border-bottom-color", "border-left-color", "fill", "stroke", "outline-color", "stop-color"];
  const applyElement = (element: Element) => {
    if (!(element instanceof HTMLElement || element instanceof SVGElement) || element === probe || element.closest("[data-appearance-reference]")) return;
    const records = originals.get(element) ?? new Map<string, { source: string; output: string }>();
    for (const key of [...properties, ...Array.from(element.style).filter(name => name.startsWith("--")), "@fill", "@stroke", "@stop-color"]) {
      const attr = key.startsWith("@");
      const name = attr ? key.slice(1) : key;
      const current = attr ? element.getAttribute(name) ?? "" : element.style.getPropertyValue(name);
      if (records.get(key)?.output === current) continue;
      records.delete(key);
      if (!current || current.includes("var(") || !CSS.supports("color", current)) continue;
      const output = convertAppearanceColor(resolve(current), appearance);
      if (output === current) continue;
      // Browsers may normalize assigned CSS; compare the actual serialized output on the next mutation.
      if (attr) element.setAttribute(name, output);
      else element.style.setProperty(name, output, element.style.getPropertyPriority(name));
      records.set(key, { source: current, output: attr ? element.getAttribute(name) ?? output : element.style.getPropertyValue(name) });
    }
    if (records.size) originals.set(element, records);
    else originals.delete(element);
  };
  const scan = (element: Element) => {
    applyElement(element);
    element.querySelectorAll("[style], [fill], [stroke], [stop-color]").forEach(applyElement);
  };
  scan(document.body);
  const observer = new MutationObserver(entries => {
    for (const entry of entries) {
      if (entry.type === "attributes" && entry.target instanceof Element) applyElement(entry.target);
      for (const node of entry.addedNodes) if (node instanceof Element) scan(node);
      for (const node of entry.removedNodes) if (node instanceof Element) {
        for (const element of originals.keys()) if (node === element || node.contains(element)) originals.delete(element);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "fill", "stroke", "stop-color"] });
  const rootObserver = new MutationObserver(refreshTokens);
  rootObserver.observe(root, { attributes: true, attributeFilter: ["class", "style"] });
  root.dataset['appAppearance'] = appearance;
  return () => {
    observer.disconnect();
    rootObserver.disconnect();
    for (const [element, records] of originals) {
      if (!(element instanceof HTMLElement || element instanceof SVGElement)) continue;
      for (const [key, record] of records) {
        const attr = key.startsWith("@");
        const name = attr ? key.slice(1) : key;
        if (attr && element.getAttribute(name) === record.output) element.setAttribute(name, record.source);
        else if (!attr && element.style.getPropertyValue(name) === record.output) element.style.setProperty(name, record.source, element.style.getPropertyPriority(name));
      }
    }
    sheet.remove();
    probe.remove();
    delete root.dataset['appAppearance'];
  };
}
export function AppAppearanceApplier() {
  const { data } = useAppAppearance();
  useEffect(() => data ? mountAppAppearance(data) : undefined, [data]);
  return null;
}
