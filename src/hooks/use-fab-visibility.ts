"use client";

import { useEffect, useState } from "react";

/**
 * Visibility controller for floating action buttons (e.g. AI Asisten FAB).
 *
 * Hides the FAB in 4 situations:
 *
 *   1. User is scrolling DOWN — FAB slides away so it doesn't cover CTAs the
 *      user is scrolling toward. Reappears on scroll UP or near top/bottom.
 *
 *   2. A modal / dialog / sheet is open (Radix `[data-state="open"]`).
 *      Modals have their own primary CTA — FAB just gets in the way.
 *
 *   3. Mobile virtual keyboard is open (visualViewport height shrinks).
 *      Every form has its own submit button above the keyboard.
 *
 *   4. An element with [data-hides-fab] is present in the DOM — used by
 *      bottom navigation bars in multi-step forms (e.g. claim wizard) to
 *      explicitly signal they conflict with the FAB position.
 *      Also detects interactive elements (button/a/input) that overlap
 *      the FAB's bounding box in the bottom-right corner.
 */
export function useFabVisibility(options?: { enabled?: boolean }): boolean {
  const enabled = options?.enabled ?? true;
  const [visible, setVisible] = useState(true);

  // ---- 1. Scroll direction ----
  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }

    let lastY = typeof window !== "undefined" ? window.scrollY : 0;
    let ticking = false;

    const SCROLL_DOWN_THRESHOLD = 8;
    const SCROLL_UP_THRESHOLD = 4;
    const NEAR_TOP = 80;
    const NEAR_BOTTOM = 120;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const nearTop = y < NEAR_TOP;
        const nearBottom = docHeight > 0 && y > docHeight - NEAR_BOTTOM;

        if (nearTop || nearBottom) {
          setVisible(true);
        } else if (delta > SCROLL_DOWN_THRESHOLD) {
          setVisible(false);
        } else if (delta < -SCROLL_UP_THRESHOLD) {
          setVisible(true);
        }

        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  // ---- 2. Open modal / dialog / sheet ----
  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const SELECTOR =
      '[data-state="open"][role="dialog"], ' +
      '[data-state="open"][role="alertdialog"], ' +
      '[data-radix-popper-content-wrapper] [data-state="open"]';

    const checkModalOpen = () => {
      const hasOpenModal = document.querySelector(SELECTOR);
      const scrollLocked = document.body.hasAttribute("data-scroll-locked");
      if (hasOpenModal || scrollLocked) setVisible(false);
    };

    checkModalOpen();

    const observer = new MutationObserver(checkModalOpen);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["data-state", "data-scroll-locked", "aria-hidden"],
      subtree: true,
      childList: true,
    });

    return () => observer.disconnect();
  }, [enabled]);

  // ---- 3. Mobile virtual keyboard open ----
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    const onResize = () => {
      const ratio = vv.height / window.innerHeight;
      if (ratio < 0.78) setVisible(false);
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [enabled]);

  // ---- 4. Bottom action bar / element overlap ----
  useEffect(() => {
    if (!enabled) return;
    if (typeof document === "undefined") return;

    const checkConflict = () => {
      // a) Explicit signal: any element with [data-hides-fab] is present
      if (document.querySelector("[data-hides-fab]")) {
        setVisible(false);
        return;
      }

      // b) Proximity check: find buttons/links near the FAB's bounding area.
      //    FAB sits at bottom-right: approx right-3 bottom-4 on mobile (sm: right-6 bottom-6).
      const isSm = window.innerWidth >= 640;
      const fabW = isSm ? 176 : 48;  // sm: pill ~176px wide, mobile: 48px square
      const fabH = isSm ? 56 : 48;
      const fabRight = isSm ? 24 : 12;
      const fabBottom = isSm ? 24 : 16;

      const fabRect = {
        left: window.innerWidth - fabRight - fabW,
        top: window.innerHeight - fabBottom - fabH,
        right: window.innerWidth - fabRight,
        bottom: window.innerHeight - fabBottom,
      };

      const candidates = document.querySelectorAll<HTMLElement>(
        'button:not([aria-label="Buka Natalie AI"]), a[href]:not([aria-label="Buka Natalie AI"]), input:not([type="hidden"]), select, textarea'
      );

      for (const el of candidates) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        const overlaps =
          r.left < fabRect.right + 4 &&
          r.right > fabRect.left - 4 &&
          r.top < fabRect.bottom + 4 &&
          r.bottom > fabRect.top - 4;
        if (overlaps) {
          setVisible(false);
          return;
        }
      }

      // No conflict found — ensure visible (scroll logic may have already hidden it)
      // Only restore if we're near the top or page has no scroll
      const noScroll = document.documentElement.scrollHeight <= window.innerHeight + 2;
      const nearTop = window.scrollY < 80;
      if (noScroll || nearTop) setVisible(true);
    };

    // Run after DOM settles, and re-run on any DOM mutations (form step changes)
    const timeout = setTimeout(checkConflict, 120);

    const observer = new MutationObserver(() => {
      clearTimeout(0);
      setTimeout(checkConflict, 80);
    });
    observer.observe(document.body, { subtree: true, childList: true });

    window.addEventListener("resize", checkConflict, { passive: true });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
      window.removeEventListener("resize", checkConflict);
    };
  }, [enabled]);

  return enabled ? visible : true;
}
