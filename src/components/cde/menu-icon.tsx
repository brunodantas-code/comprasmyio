import { createElement, lazy, Suspense, type ComponentType } from "react";
import dynamicIconImports from "lucide-react/dynamicIconImports.mjs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MENU_ICONS_GROUP, MENU_ICONS_QUERY, parseMenuIcons, resolveMenuIcon } from "./menu-icons";

type IconProps = { className?: string };
const loaded = new Map<string, ComponentType<IconProps>>();
export function getMenuIcon(name: string): ComponentType<IconProps> | undefined {
  const importer = dynamicIconImports[name as keyof typeof dynamicIconImports];
  if (!importer) return undefined;
  const cached = loaded.get(name);
  if (cached) return cached;
  const Icon = lazy(importer);
  loaded.set(name, Icon);
  return Icon;
}

export function useMenuIcons() {
  return useQuery({ queryKey: MENU_ICONS_QUERY, staleTime: 60_000, queryFn: async () => {
    const { data, error } = await supabase.from("cde_selected").select("variant_key").eq("group_key", MENU_ICONS_GROUP).eq("is_primary", true).maybeSingle();
    if (error) throw error;
    return parseMenuIcons(data?.variant_key);
  } });
}

export function CdeMenuIcon({ app, group, identity, fallback: Fallback, className }: { app: string; group: string; identity: string; fallback?: ComponentType<IconProps>; className?: string }) {
  const { data } = useMenuIcons();
  const name = resolveMenuIcon(data, app, group, identity);
  const Icon = name ? getMenuIcon(name) : undefined;
  const original = Fallback ? <Fallback {...(className ? { className } : {})} /> : null;
  return Icon ? <Suspense fallback={original}><Icon {...(className ? { className } : {})} /></Suspense> : original;
}

const wrappers = new WeakMap<object, Map<string, ComponentType<IconProps>>>();
/** Wrap only the symbol; retain original identities, destinations and commands. */
export function wrapMenuIcon<T>(fallback: T, app: string, group: string, identity: string): T {
  if (!fallback || (typeof fallback !== "function" && typeof fallback !== "object")) return fallback;
  const original = fallback as object;
  let map = wrappers.get(original);
  if (!map) { map = new Map(); wrappers.set(original, map); }
  const key = JSON.stringify([app, group, identity]);
  let Wrapped = map.get(key);
  if (!Wrapped) {
    Wrapped = (props: IconProps) => createElement(CdeMenuIcon, { ...props, app, group, identity, fallback: fallback as ComponentType<IconProps> });
    map.set(key, Wrapped);
  }
  return Wrapped as T;
}