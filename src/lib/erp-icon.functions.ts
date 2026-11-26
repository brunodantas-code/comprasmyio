import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { erpIconKey, appIconChoices } from "./erp-icon";

export const getErpIcon = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Configuração indisponível");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const [result, apps] = await Promise.all([client.rpc("public_erp_icon"), client.rpc("public_app_shortcut_icons")]);
  if (result.error) throw result.error;
  if (apps.error) throw apps.error;
  return { erp: erpIconKey(result.data), apps: appIconChoices(apps.data) };
});