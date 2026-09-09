import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

function parseBrl(raw: string): number | null {
  const cleaned = raw.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;
  // Brazilian format: 1.234,56
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n <= 0 || n > 1000000000) return null;
  return Math.round(n * 100) / 100;
}

function extractPrice(html: string): number | null {
  const head = html.slice(0, 200000);

  // 1) Meta tags: product:price:amount, og:price:amount, twitter data
  const metaRegexes = [
    /<meta[^>]+property=["'](?:product:price:amount|og:price:amount)["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["'](?:product:price:amount|og:price:amount)["']/i,
    /<meta[^>]+itemprop=["']price["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+itemprop=["']price["']/i,
  ];
  for (const re of metaRegexes) {
    const m = head.match(re);
    if (m?.[1]) {
      const n = Number(m[1].replace(",", "."));
      if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
    }
  }

  // 2) JSON-LD "price": "123.45"
  const ldBlocks = head.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) ?? [];
  for (const block of ldBlocks) {
    const json = block.replace(/<\/?script[^>]*>/gi, "");
    const m = json.match(/"price"\s*:\s*"?([\d.,]+)"?/);
    if (m?.[1]) {
      const n = Number(m[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
      if (Number.isFinite(n) && n > 0) return Math.round(n * 100) / 100;
    }
  }

  // 3) Plain "R$ 1.234,56" occurrences — take the first plausible one
  const moneyMatches = head.match(/R\$\s?\d{1,3}(?:\.\d{3})*(?:,\d{2})/g);
  if (moneyMatches?.length) {
    for (const raw of moneyMatches) {
      const n = parseBrl(raw);
      if (n) return n;
    }
  }

  return null;
}

export const lookupLinkPrice = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ url: z.string().url().max(2000) }).parse(data))
  .handler(async ({ data }) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(data.url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MyioSupplyBot/1.0)",
          Accept: "text/html,application/xhtml+xml",
        },
      });
      clearTimeout(timer);
      if (!res.ok) return { price: null as number | null };
      const html = await res.text();
      return { price: extractPrice(html) };
    } catch {
      return { price: null as number | null };
    }
  });
