import { useEffect, useRef, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";

/** Keep app navigation outside page stacking/scrolling contexts, below dialogs. */
export function AppNavigation({ className = "", ...props }: ComponentProps<"nav">) {
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted) return;
    const viewport = window.visualViewport;
    const update = () => {
      const bottom = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      ref.current?.style.setProperty("--app-nav-viewport-bottom", `${bottom}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [mounted]);
  if (!mounted) return null;
  return createPortal(<nav ref={ref} className={`app-navigation fixed inset-x-3 bottom-3 z-40 ${className}`} {...props} />, document.body);
}