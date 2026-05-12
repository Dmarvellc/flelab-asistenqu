"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_PATHS = ["/", "/login", "/register", "/access-denied"];

export function AuthWatcher() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Do not poll on public pages
    if (!pathname || PUBLIC_PATHS.some((p) => pathname.startsWith(p) || pathname.endsWith(p))) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/session", { 
          method: "GET",
          headers: { "Cache-Control": "no-cache" }
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.status === "SUSPENDED") {
            router.push("/suspended");
          }
        } else if (res.status === 401) {
          // If session is completely revoked or expired, we kick them to login
          // (assuming they aren't on a public page already)
          router.push("/login/developer"); // or specific portal login if we track it, but middleware will handle redirect properly on next load usually. 
          // Actually, let's just refresh and let the server layout redirect them
          window.location.reload();
        }
      } catch (e) {
        // Ignore network errors
      }
    }, 3000); // Poll every 3 seconds for "0 delay" feel

    return () => clearInterval(interval);
  }, [pathname, router]);

  return null;
}
