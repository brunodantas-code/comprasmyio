import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Cache-Control": "no-cache",
};

function clean(n: number | null): number | null {
  if (n === null || !Number.isFinite(n) || n <= 0 || n > 1000000000) return null;
  return Math.round(n * 100) / 100;
}

function parseBrl(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  // Brazilian format: 1.234,56
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\.(?=\d{3}\b)/g, "");
  return clean(Number(normalized));
}

function extractPrice(html: string): number | null {
  const head = html.slice(0, 400000);

  // 1) Meta tags: product:price:amount, og:price:amount, itemprop price
  const metaRegexes = [
    /<meta[^>]+property=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["'](?:product:price:amount|og:price:amount)["']/i,
    /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']price["']/i,
  ];
  for (const re of metaRegexes) {
    const m = head.match(re);
    if (m?.[1]) {
      const n = clean(Number(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")));
      if (n) return n;
    }
  }

  // 2) JSON-LD / embedded state: "price": 123.45
  const jsonPrice = head.match(/"price"\s*:\s*"?([\d.,]+)"?/);
  if (jsonPrice?.[1]) {
    const raw = jsonPrice[1];
    const n = clean(Number(raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw));
    if (n) return n;
  }

  // 3) Mercado Livre style markup: fraction + cents
  const frac = head.match(/andes-money-amount__fraction["'][^>]*>([\d.]+)</i);
  if (frac?.[1]) {
    const cents = head.match(/andes-money-amount__cents["'][^>]*>(\d{2})</i);
    const n = clean(Number(frac[1].replace(/\./g, "") + "." + (cents?.[1] ?? "00")));
    if (n) return n;
  }

  // 4) Plain "R$ 1.234,56" occurrences — take the first plausible one
  const moneyMatches = head.match(/R\$(?:&nbsp;|\s)?\d{1,3}(?:\.\d{3})*(?:,\d{2})/g);
  if (moneyMatches?.length) {
    for (const raw of moneyMatches) {
      const n = parseBrl(raw);
      if (n) return n;
    }
  }

  return null;
}

async function fetchText(url: string, headers: Record<string, string>, ms = 12000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    const res = await fetch(url, { signal: controller.signal, redirect: "follow", headers });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

/** Mercado Livre blocks plain page scraping; use their public API when we can find an item/product id. */
async function mercadoLivrePrice(url: string): Promise<number | null> {
  if (!/mercadoliv|mercadolib/i.test(url)) return null;
  const ids = new Set<string>();
  for (const m of url.matchAll(/ML[BAMU][A-Z]?-?(\d{6,})/gi)) {
    const raw = m[0].toUpperCase().replace("-", "");
    ids.add(raw);
    // /up/MLBU123 catalog ids also resolve as products
  }
  for (const id of ids) {
    const isProduct = id.startsWith("MLBU") || id.startsWith("MLU");
    const endpoints = isProduct
      ? [`https://api.mercadolibre.com/products/${id}`]
      : [`https://api.mercadolibre.com/items/${id}`];
    for (const ep of endpoints) {
      const txt = await fetchText(ep, { Accept: "application/json" }, 8000);
      if (!txt) continue;
      try {
        const json = JSON.parse(txt) as Record<string, unknown>;
        const direct = clean(Number((json as { price?: number }).price));
        if (direct) return direct;
        const bb = (json as { buy_box_winner?: { price?: number } }).buy_box_winner?.price;
        const bbPrice = clean(Number(bb));
        if (bbPrice) return bbPrice;
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

export const lookupLinkPrice = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ url: z.string().url().max(2000) }).parse(data))
  .handler(async ({ data }): Promise<{ price: number | null; blocked?: boolean }> => {
    const url = data.url;

    // 1) Direct page fetch with browser-like headers
    const html = await fetchText(url, BROWSER_HEADERS);
    if (html) {
      const price = extractPrice(html);
      if (price) return { price };
    }

    // 2) Marketplace-specific public API (Mercado Livre)
    const ml = await mercadoLivrePrice(url);
    if (ml) return { price: ml };

    // 3) Generic reader fallback for pages that need rendering
    const reader = await fetchText(
      `https://r.jina.ai/${url}`,
      { ...BROWSER_HEADERS, Accept: "text/plain" },
      15000,
    );
    if (reader) {
      const price = extractPrice(reader);
      if (price) return { price };
    }

    return { price: null, blocked: !html };
  });
