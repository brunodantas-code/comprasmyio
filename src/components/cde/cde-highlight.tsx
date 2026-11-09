import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";

export const CDE_HIGHLIGHT_PREFIX = "cde-";

export function cdeHighlightHash(siteId: string) {
  return `${CDE_HIGHLIGHT_PREFIX}${encodeURIComponent(siteId)}`;
}

/**
 * Reads the `#cde-<siteId>` hash left by CDE library usage links, scrolls the
 * matching instrumented control into view and flashes a red ring around it so
 * the user can spot where the model is used. The ring is re-applied on an
 * interval because screens re-render and replace the highlighted node.
 */
export function CdeHighlight() {
  const hash = useRouterState({ select: (s) => s.location.hash });

  useEffect(() => {
    if (!hash.startsWith(CDE_HIGHLIGHT_PREFIX)) return;
    let id = hash.slice(CDE_HIGHLIGHT_PREFIX.length);
    try { id = decodeURIComponent(id); } catch { /* already decoded */ }
    const selector = `[data-cde-id="${CSS.escape(id)}"]`;
    let attempts = 0;
    let scrolled = false;
    let reapply: ReturnType<typeof setInterval> | undefined;
    let stop: ReturnType<typeof setTimeout> | undefined;

    const finder = setInterval(() => {
      attempts += 1;
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(finder);
        if (!scrolled) {
          scrolled = true;
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        el.classList.add("cde-usage-highlight");
        // Re-apply while visible: re-renders replace the node and drop the class.
        reapply = setInterval(() => {
          document.querySelector(selector)?.classList.add("cde-usage-highlight");
        }, 250);
        stop = setTimeout(() => {
          if (reapply) clearInterval(reapply);
          document.querySelector(selector)?.classList.remove("cde-usage-highlight");
        }, 8000);
      } else if (attempts > 25) {
        clearInterval(finder);
      }
    }, 300);

    return () => {
      clearInterval(finder);
      if (reapply) clearInterval(reapply);
      if (stop) clearTimeout(stop);
    };
  }, [hash]);

  return null;
}
