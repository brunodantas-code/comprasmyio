// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { instrumentButtons } from "./scripts/cde-button-sites";

export default defineConfig({
  vite: { plugins: [{ name: "cde-live-button-bindings", enforce: "pre", transform(code, id) {
    const file = id.split("?")[0].split("/src/")[1];
    if (!file) return null;
    const result = instrumentButtons(code, file);
    return result ? { code: result, map: null } : null;
  } }] },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
