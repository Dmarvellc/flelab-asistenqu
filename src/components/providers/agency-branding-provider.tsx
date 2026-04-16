"use client";

import { createContext, useContext, useEffect } from "react";

export interface AgencyBrandingData {
  agencyId: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarBg: string;
  sidebarText: string;
  loginBg: string;
}

const DEFAULT_BRANDING: AgencyBrandingData = {
  agencyId: "",
  slug: "",
  name: "AsistenQu",
  logoUrl: null,
  primaryColor: "#111827",
  secondaryColor: "#374151",
  accentColor: "#3B82F6",
  sidebarBg: "#FFFFFF",
  sidebarText: "#111827",
  loginBg: "#F9FAFB",
};

const AgencyBrandingContext = createContext<AgencyBrandingData>(DEFAULT_BRANDING);

export function useAgencyBranding() {
  return useContext(AgencyBrandingContext);
}

export function AgencyBrandingProvider({
  branding,
  children,
}: {
  branding?: AgencyBrandingData | null;
  children: React.ReactNode;
}) {
  const data = branding || DEFAULT_BRANDING;

  // Inject CSS custom properties for dynamic theming
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--agency-primary", data.primaryColor);
    root.style.setProperty("--agency-secondary", data.secondaryColor);
    root.style.setProperty("--agency-accent", data.accentColor);
    root.style.setProperty("--agency-sidebar-bg", data.sidebarBg);
    root.style.setProperty("--agency-sidebar-text", data.sidebarText);
    root.style.setProperty("--agency-login-bg", data.loginBg);
  }, [data]);

  return (
    <AgencyBrandingContext.Provider value={data}>
      {children}
    </AgencyBrandingContext.Provider>
  );
}
