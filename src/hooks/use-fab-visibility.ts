"use client";

import { useEffect, useState } from "react";

/**
 * Visibility controller for floating action buttons (e.g. Natalie AI FAB).
 *
 * Hides the FAB in 4 situations:
 *
 *   1. User is scrolling DOWN — FAB slides away so it doesn't cover CTAs the
 *      user is scrolling toward. Reappears on scroll UP or near top/bottom.
 *
 *   2. A modal / dialog / sheet is open (Radix `[data-state="open"]`).
 *
 *   3. Mobile virtual keyboard is open (visualViewport height shrinks).
 *
 *   4. An interactive element (button, link, input) is visually behind the FAB.
 *      Uses document.elementsFromPoint() at the FAB's exact screen coordinates —
 *      only the pixels the FAB actually occupies are checked, so sidebar links
 *      and header buttons never trigger a false positive.
 *      Also respects [data-hides-fab] on any element as an explicit override.
 */
export function useFabVisibility(options?: { enabled?: boolean }): boolean {
  const enabled = options?.enabled ?? true;
  const [visible, setVisible] = useState(true);

  // ── 1. Scroll direction ────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled) { setVisible(true); return; }

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

        if (nearTop || nearBottom) setVisible(true);
        else if (delta > SCROLL_DOWN)  setVisible(false);
        else if (delta < -SCROLL_UP)   setVisible(true);

        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  // ── 2. Open modal / dialog / sheet ────────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const SELECTOR =
      '[data-state="open"][role="dialog"],' +
      '[data-state="open"][role="alertdialog"],' +
      '[data-radix-popper-content-wrapper] [data-state="open"]';

    const check = () => {
      const open = document.querySelector(SELECTOR);
      const locked = document.body.hasAttribute("data-scroll-locked");
      if (open || locked) setVisible(false);
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
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => { if (vv.height / window.innerHeight < 0.78) setVisible(false); };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [enabled]);

  // ── 4. Visual overlap at FAB position ─────────────────────────────────────
  useEffect(() => {
    if (!enabled) return;
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
        setVisible(false);
        return;
      }

      // b) elementsFromPoint at the FAB's visual center.
      //    This only looks at the exact pixels the FAB occupies, so sidebar
      //    nav links, header icons, etc. are never considered.
      const isSm = window.innerWidth >= 640;
      const right  = isSm ? 24 : 12;   // Tailwind right-6 / right-3
      const bottom = isSm ? 24 : 16;   // Tailwind bottom-6 / bottom-[max(1rem,...)]
      const size   = isSm ? 56 : 48;   // h-14 / h-12

      const cx = window.innerWidth  - right  - size / 2;
      const cy = window.innerHeight - bottom - size / 2;

      // elementsFromPoint (plural) returns ALL layers at that point, top to bottom.
      const stack = document.elementsFromPoint(cx, cy);

      const conflict = stack.some(el =>
        // Exclude the FAB itself and anything inside it
        !el.closest("[data-natalie-fab]") &&
        el.matches(INTERACTIVE)
      );

      if (conflict) setVisible(false);
    };

    const debounced = () => { clearTimeout(timer); timer = setTimeout(check, 150); };

    debounced();
    window.addEventListener("resize", debounced, { passive: true });

    // Only watch for elements added/removed, not attribute churn
    const obs = new MutationObserver(debounced);
    obs.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", debounced);
      obs.disconnect();
    };
  }, [enabled]);

  return enabled ? visible : true;
}
