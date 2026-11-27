import { useEffect, useRef, useState, type ComponentProps, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { MENU_LOOK_DEFAULT, menuLookVars, useMenuLook } from "@/components/cde/menu-look";
import { useCurrentUser } from "@/hooks/use-current-user";
import { clampMenuWidth, draggedMenuWidth, menuResizeLimits, personalMenuWidthKey } from "@/components/cde/menu-resize";

/** Keep app navigation outside page stacking/scrolling contexts, below dialogs. */
export function AppNavigation({ className = "", children, ...props }: ComponentProps<"nav">) {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState("floating");
  const ref = useRef<HTMLElement>(null);
  // Look saved in the CDE (group menu_look): background, text, selected item, border and shadow.
  const { data: look } = useMenuLook();
  const userId = useCurrentUser().data?.id;
  const [desktop, setDesktop] = useState(true);
  const [viewport, setViewport] = useState(1280);
  const [personal, setPersonal] = useState<{ key: string; width: number } | null>(null);
  const drag = useRef<{ x: number; width: number } | null>(null);
  const storageKey = userId ? personalMenuWidthKey(userId, props["aria-label"] ?? "app", desktop) : null;
  const lateral = layout === "left" || layout === "right";
  const flexible = look?.flexible === true && lateral && !!storageKey;
  const width = flexible && personal?.key === storageKey ? clampMenuWidth(personal.width, viewport) : look?.sideWidth;
  const limits = menuResizeLimits(viewport);
  useEffect(() => {
    if (!storageKey) { setPersonal(null); return; }
    try {
      const saved = localStorage.getItem(storageKey);
      const value = saved === null ? NaN : Number(saved);
      setPersonal(Number.isFinite(value) ? { key: storageKey, width: value } : null);
    } catch { setPersonal(null); }
  }, [storageKey]);
  const resize = (next: number) => {
    if (!flexible || !storageKey) return;
    const value = clampMenuWidth(next, window.innerWidth);
    setPersonal({ key: storageKey, width: value });
    document.documentElement.style.setProperty("--app-menu-side-custom-width", `${value}px`);
    ref.current?.style.setProperty("--app-menu-side-custom-width", `${value}px`);
    try { localStorage.setItem(storageKey, String(value)); } catch { /* Session resize still works. */ }
  };
  function endDrag(event: PointerEvent<HTMLSpanElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  useEffect(() => {
    const root = document.documentElement.style;
    if (width != null) root.setProperty("--app-menu-side-custom-width", `${width}px`);
    else root.removeProperty("--app-menu-side-custom-width");
    return () => { root.removeProperty("--app-menu-side-custom-width"); };
  }, [width]);
  useEffect(() => { setMounted(true); }, []);
  // Content space follows the panel that is really on screen: floating, bottom and
  // unmounted menus must not shrink the lists.
  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement.style;
    root.setProperty("--erp-side-offset", layout === "left" || layout === "right" ? "var(--app-menu-side-offset)" : "0px");
    return () => { root.removeProperty("--erp-side-offset"); };
  }, [layout, mounted]);
  useEffect(() => {
    const breakpoint = window.matchMedia("(min-width: 1024px)");
    const update = () => {
      setDesktop(breakpoint.matches);
      setViewport(window.innerWidth);
      const prefix = breakpoint.matches ? "menu-desktop-" : "menu-mobile-";
      setLayout(className.split(/\s+/).find(value => value.startsWith(prefix))?.slice(prefix.length) ?? "floating");
    };
    update();
    breakpoint.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => { breakpoint.removeEventListener("change", update); window.removeEventListener("resize", update); };
  }, [className]);
  // The side panel starts exactly where the sticky top band ends, whatever height CDE gives it.
  useEffect(() => {
    if (!mounted) return;
    const header = document.querySelector<HTMLElement>("header.home-page-header");
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--app-header-bottom", `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener("resize", update); window.removeEventListener("scroll", update); };
  }, [mounted]);
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
  return createPortal(<nav ref={ref} data-menu-layout={layout} style={menuLookVars({ ...(look ?? MENU_LOOK_DEFAULT), sideWidth: width ?? null })} className={`app-navigation fixed inset-x-3 bottom-3 z-40 ${className}`} {...props}>
    {children}
    {flexible ? <span role="separator" tabIndex={0} aria-label="Ajustar largura do menu lateral" aria-orientation="vertical" aria-valuemin={limits.min} aria-valuemax={limits.max} aria-valuenow={width ?? (desktop ? 240 : 160)} title="Arrastar para ajustar a largura" className="app-menu-resize-handle"
      onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); drag.current = { x: event.clientX, width: ref.current?.getBoundingClientRect().width ?? 240 }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={event => { const start = drag.current; if (start) resize(draggedMenuWidth(start.width, event.clientX - start.x, layout, window.innerWidth)); }}
      onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={event => { const current = ref.current?.getBoundingClientRect().width ?? 240; if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); resize(draggedMenuWidth(current, event.key === "ArrowRight" ? 10 : -10, layout, window.innerWidth)); } else if (event.key === "Home" || event.key === "End") { event.preventDefault(); resize(event.key === "Home" ? limits.min : limits.max); } }} /> : null}
  </nav>, document.body);
}