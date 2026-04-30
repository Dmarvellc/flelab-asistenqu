"use client";

import { useEffect, useState } from "react";

/**
 * Visibility controller for floating action buttons (e.g. AI Asisten FAB).
 *
 * Hides the FAB in 3 situations that commonly cause overlap with other buttons:
 *
 *   1. User is scrolling DOWN (FAB slides away so it doesn't cover bottom-aligned
 *      "Simpan / Kirim / Submit" CTAs the user is scrolling toward). Reappears as
 *      soon as the user scrolls UP, or stops near the very top / very bottom.
 *
 *   2. A modal / dialog / sheet / drawer is open. Detected by Radix-style
 *      `[data-state="open"]` on `[role="dialog"]` / `[role="alertdialog"]`.
 *      Modals usually have their own primary CTA — the FAB just gets in the way.
 *
 *   3. The mobile virtual keyboard is open. Detected via the visualViewport API
 *      (height shrinks noticeably). When the keyboard is up, every form has its
 *      own "Kirim" / "Simpan" button right above it, and the FAB obscures it.
 *
 * The component using this hook is responsible for actually animating the FAB
 * (e.g. translateY + opacity + pointer-events).
 *
 * @param options.enabled set to false to keep the FAB always visible
 *                        (e.g. while the chat panel is open)
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

    const SCROLL_DOWN_THRESHOLD = 8; // px of downward movement before hiding
    const SCROLL_UP_THRESHOLD = 4;   // px of upward movement before re-showing
    const NEAR_TOP = 80;             // always visible near top
    const NEAR_BOTTOM = 120;         // always visible near bottom

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
      // Also treat scroll-locked body (Radix sets data-scroll-locked) as a modal open.
      const scrollLocked = document.body.hasAttribute("data-scroll-locked");
      if (hasOpenModal || scrollLocked) {
        setVisible(false);
      }
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
      // If visual viewport shrank significantly relative to layout viewport,
      // a virtual keyboard is most likely open.
      const ratio = vv.height / window.innerHeight;
      if (ratio < 0.78) {
        setVisible(false);
      }
      // We intentionally do NOT auto-show on keyboard close; the next scroll
      // event will bring it back. This avoids flicker.
    };

    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [enabled]);

  return enabled ? visible : true;
}
