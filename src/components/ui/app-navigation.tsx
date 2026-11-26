import { useEffect, useRef, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import { MENU_LOOK_DEFAULT, menuLookVars, useMenuLook } from "@/components/cde/menu-look";

/** Keep app navigation outside page stacking/scrolling contexts, below dialogs. */
export function AppNavigation({ className = "", ...props }: ComponentProps<"nav">) {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState("floating");
  const ref = useRef<HTMLElement>(null);
  // Look saved in the CDE (group menu_look): background, text, selected item, border and shadow.
  const { data: look } = useMenuLook();
  useEffect(() => {
    const root = document.documentElement.style;
    if (look?.sideWidth != null) root.setProperty("--app-menu-side-custom-width", `${look.sideWidth}px`);
    else root.removeProperty("--app-menu-side-custom-width");
    return () => { root.removeProperty("--app-menu-side-custom-width"); };
  }, [look?.sideWidth]);
  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const breakpoint = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      const prefix = breakpoint.matches ? "menu-desktop-" : "menu-mobile-";
      setLayout(className.split(/\s+/).find(value => value.startsWith(prefix))?.slice(prefix.length) ?? "floating");
    };
    update();
    breakpoint.addEventListener("change", update);
    return () => breakpoint.removeEventListener("change", update);
  }, [className]);
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
  return createPortal(<nav ref={ref} data-menu-layout={layout} style={menuLookVars(look ?? MENU_LOOK_DEFAULT)} className={`app-navigation fixed inset-x-3 bottom-3 z-40 ${className}`} {...props} />, document.body);
}