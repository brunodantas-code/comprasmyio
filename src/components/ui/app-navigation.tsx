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
    let fullHeight = window.innerHeight;
    const update = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && (active.matches("input:not([type=checkbox]):not([type=radio]), textarea") || active.isContentEditable);
      if (!editing) fullHeight = window.innerHeight;
      const keyboardHeight = viewport && editing ? Math.max(0, fullHeight - viewport.height - viewport.offsetTop) : 0;
      // Keep the bar at the layout bottom behind the native keyboard, not above
      // it over the search. Native keyboard chrome cannot host webpage controls.
      const bottom = keyboardHeight > 120 ? -keyboardHeight : viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      ref.current?.style.setProperty("--app-nav-viewport-bottom", `${bottom}px`);
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, [mounted]);
  if (!mounted) return null;
  return createPortal(<nav ref={ref} className={`app-navigation fixed inset-x-3 bottom-3 z-40 ${className}`} {...props} />, document.body);
}