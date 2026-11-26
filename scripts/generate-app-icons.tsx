import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { APP_ICONS } from "../src/lib/app-icons";
import { APP_SHORTCUTS } from "../src/lib/app-shortcuts";

// Asset preparation only; never imported by the app/Worker.
const css = readFileSync("src/styles.css", "utf8");
const green = css.match(/--myio-green:\s*([^;]+);/)?.[1]?.trim();
const white = css.match(/--myio-white:\s*([^;]+);/)?.[1]?.trim();
if (!green || !white) throw new Error("Missing brand tokens");
for (const app of APP_SHORTCUTS) {
  const entry = APP_ICONS[app.key];
  if (!entry) throw new Error(`Missing Home symbol: ${app.key}`);
  const [Icon, strokeWidth] = entry;
  const dir = `public/app-icons/${app.key}`;
  mkdirSync(dir, { recursive: true });
  const symbol = renderToStaticMarkup(<Icon style={{ strokeWidth }} />)
    .replace(/currentColor/g, green).replace(/<svg /, '<svg x="96" y="96" width="320" height="320" ');
  writeFileSync(`${dir}/icon.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="${white}"/>${symbol}</svg>`);
  writeFileSync(`${dir}/manifest.webmanifest`, JSON.stringify({
    name: `myio ${app.name}`, short_name: app.name, id: app.path, start_url: app.path,
    scope: "/", display: "standalone", lang: "pt-BR", background_color: white, theme_color: green,
    icons: [
      { src: `/app-icons/${app.key}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/app-icons/${app.key}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  }, null, 2) + "\n");
}
// Chromium rasterizes the exact same SVGs without introducing a media dependency.
execFileSync("python3", ["-c", `
import asyncio
from pathlib import Path
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        for directory in Path('public/app-icons').iterdir():
            svg = (directory / 'icon.svg').read_text()
            for filename, size in [('favicon.png',64),('apple-touch-icon.png',180),('icon-192.png',192),('icon-512.png',512)]:
                await page.set_viewport_size({'width':size,'height':size})
                await page.set_content('<style>body{margin:0}body>svg{width:100%;height:100%}</style>'+svg)
                await page.locator('body>svg').screenshot(path=str(directory / filename))
        await browser.close()
asyncio.run(main())
`], { stdio: "inherit" });
console.log(`Generated icons and manifests for ${APP_SHORTCUTS.length} apps.`);