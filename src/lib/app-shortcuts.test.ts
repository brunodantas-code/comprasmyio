import { describe, expect, it } from "vitest";
import { APP_SHORTCUTS, appShortcutHead } from "./app-shortcuts";

describe("individual app shortcuts", () => {
  for (const app of APP_SHORTCUTS) {
    it(`${app.name} uses its own icon and manifest`, () => {
      const head = appShortcutHead(app.path);
      expect(head.links.find(link => link.rel === "icon")?.href).toBe(`/app-icons/${app.key}/favicon.png`);
      expect(head.links.find(link => link.rel === "manifest")?.href).toBe(`/app-icons/${app.key}/manifest.webmanifest`);
      expect(head.meta[0]?.content).toBe(`myio ${app.name}`);
    });
  }
  it("keeps the ERP icon on Home and login", () => {
    for (const path of ["/", "/portal", "/auth", "/spending"]) {
      expect(appShortcutHead(path).links[0]?.href).toBe("/favicon.png");
    }
  });
});