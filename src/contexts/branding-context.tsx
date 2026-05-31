"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

export interface Branding {
  display_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  support_email: string | null;
}

export const DEFAULT_BRANDING: Branding = {
  display_name: "Liberty CRM",
  logo_url: null,
  favicon_url: null,
  primary_color: "#9aea62",
  secondary_color: "#000000",
  support_email: "suporte@libertycrm.com.br",
};

const BrandingContext = createContext<Branding>(DEFAULT_BRANDING);

export function BrandingProvider({ branding, children }: { branding: Branding; children: ReactNode }) {
  useEffect(() => {
    document.documentElement.style.setProperty("--brand-primary", branding.primary_color);
    document.documentElement.style.setProperty("--brand-secondary", branding.secondary_color);
    if (branding.favicon_url) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
      if (link) link.href = branding.favicon_url;
    }
    document.title = branding.display_name;
  }, [branding]);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export const useBranding = () => useContext(BrandingContext);
