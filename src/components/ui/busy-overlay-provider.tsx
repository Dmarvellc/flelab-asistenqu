"use client";

/**
 * BusyOverlayProvider — global, full-screen "busy" gate.
 *
 * Usage:
 *   const { run } = useBusy();
 *   await run(async () => {
 *     await fetch("/api/...");
 *   }, "Menghapus user…");
 *
 * While at least one `run` is in flight:
 *   • A backdrop covers the entire viewport (z-index 200)
 *   • All clicks/keystrokes underneath are blocked
 *   • A small spinner + optional label is shown
 *
 * The provider counts concurrent calls, so several `run`s can overlap and
 * the overlay only disappears when all of them resolve/reject.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type BusyContextValue = {
  busy: boolean;
  label: string | null;
  run: <T>(fn: () => Promise<T>, label?: string) => Promise<T>;
};

const BusyContext = createContext<BusyContextValue | null>(null);

export function BusyOverlayProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState(0);
  const [label, setLabel] = useState<string | null>(null);
  const labelStack = useRef<(string | null)[]>([]);

  const run = useCallback(async <T,>(fn: () => Promise<T>, lbl?: string): Promise<T> => {
    labelStack.current.push(lbl ?? null);
    setLabel(labelStack.current[labelStack.current.length - 1]);
    setCount((c) => c + 1);
    try {
      return await fn();
    } finally {
      labelStack.current.pop();
      setLabel(labelStack.current[labelStack.current.length - 1] ?? null);
      setCount((c) => Math.max(0, c - 1));
    }
  }, []);

  const value = useMemo<BusyContextValue>(
    () => ({ busy: count > 0, label, run }),
    [count, label, run],
  );

  return (
    <BusyContext.Provider value={value}>
      {children}
      {count > 0 && (
        <div
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-black/40 backdrop-blur-sm"
          // Block clicks on the underlying UI; explicitly capture wheel/touch too.
          onClickCapture={(e) => e.stopPropagation()}
          onMouseDownCapture={(e) => e.stopPropagation()}
          onKeyDownCapture={(e) => e.stopPropagation()}
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white"
            role="status"
            aria-label="Memproses"
          />
          {label && (
            <p className="text-sm font-medium text-white drop-shadow">{label}</p>
          )}
        </div>
      )}
    </BusyContext.Provider>
  );
}

export function useBusy(): BusyContextValue {
  const ctx = useContext(BusyContext);
  if (!ctx) {
    // Safe fallback: if no provider is mounted, just execute the function.
    return {
      busy: false,
      label: null,
      run: async <T,>(fn: () => Promise<T>) => fn(),
    };
  }
  return ctx;
}
