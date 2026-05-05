"use client";

import { useEffect, useState } from "react";

/**
 * Visibility controller for floating action buttons (e.g. Natalie AI FAB).
 *
 * Each reason for hiding is tracked independently so they can't override
 * each other. Final visibility = not any reason.
 *
 *   1. Scrolling DOWN  — reappears on scroll UP or near top/bottom.
 *   2. A modal / dialog / sheet is open (Radix `[data-state="open"]`).
 *   3. Mobile virtual keyboard is open (visualViewport height shrinks).
 *   4. An interactive element is visually behind the FAB (elementsFromPoint).
 *      Also respects [data-hides-fab] as an explicit override.
 */
export function useFabVisibility(options?: { enabled?: boolean }): boolean {
  const enabled = options?.enabled ?? true;

  const [scrollHidden,   setScrollHidden]   = useState(false);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [keyboardOpen,   setKeyboardOpen]   = useState(false);
  const [conflict,       setConflict]       = useState(false);

  // ── 1. Scroll direction ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) { setScrollHidden(false); return; }

    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let ticking = false;
    const SCROLL_DOWN = 8;
    const SCROLL_UP = 4;
    const NEAR_TOP = 80;
    const NEAR_BOTTOM = 120;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const nearTop = y < NEAR_TOP;
        const nearBottom = max > 0 && y > max - NEAR_BOTTOM;

        if (nearTop || nearBottom) setScrollHidden(false);
        else if (delta > SCROLL_DOWN)  setScrollHidden(true);
        else if (delta < -SCROLL_UP)   setScrollHidden(false);

        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  // ── 2. Open modal / dialog / sheet ────────────────────────────────────────
  useEffect(() => {
    if (!enabled) { setModalOpen(false); return; }
    if (typeof document === "undefined") return;

    const SELECTOR =
      '[data-state="open"][role="dialog"],' +
      '[data-state="open"][role="alertdialog"],' +
      '[data-radix-popper-content-wrapper] [data-state="open"]';

    const check = () => {
      const open = document.querySelector(SELECTOR);
      const locked = document.body.hasAttribute("data-scroll-locked");
      setModalOpen(!!(open || locked));
    };

    check();
    const obs = new MutationObserver(check);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-state", "data-scroll-locked"],
      subtree: true,
    });
    return () => obs.disconnect();
  }, [enabled]);

  // ── 3. Mobile virtual keyboard ─────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) { setKeyboardOpen(false); return; }
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKeyboardOpen(vv.height / window.innerHeight < 0.78);
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [enabled]);

  // ── 4. Visual overlap at FAB position ─────────────────────────────────────
  useEffect(() => {
    if (!enabled) { setConflict(false); return; }
    if (typeof document === "undefined") return;

    const INTERACTIVE = [
      "button:not([disabled])",
      "a[href]",
      "input:not([type='hidden']):not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[role="button"]',
    ].join(",");

    let timer: ReturnType<typeof setTimeout>;

    const check = () => {
      // a) Explicit override — any element can signal it conflicts with the FAB
      if (document.querySelector("[data-hides-fab]")) {
        setConflict(true);
        return;
      }

      // b) elementsFromPoint at the FAB's visual center.
      const isSm = window.innerWidth >= 640;
      const right  = isSm ? 24 : 12;
      const bottom = isSm ? 24 : 16;
      const size   = isSm ? 56 : 48;

      const cx = window.innerWidth  - right  - size / 2;
      const cy = window.innerHeight - bottom - size / 2;

      const stack = document.elementsFromPoint(cx, cy);
      const hasConflict = stack.some(el =>
        !el.closest("[data-natalie-fab]") &&
        el.matches(INTERACTIVE)
      );

      setConflict(hasConflict);
    };

    const debounced = () => { clearTimeout(timer); timer = setTimeout(check, 150); };

    debounced();
    window.addEventListener("resize", debounced, { passive: true });
    window.addEventListener("scroll", debounced, { passive: true });

    const obs = new MutationObserver(debounced);
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", debounced);
      window.removeEventListener("scroll", debounced);
      obs.disconnect();
    };
  }, [enabled]);

  if (!enabled) return true;
  return !(scrollHidden || modalOpen || keyboardOpen || conflict);
}
