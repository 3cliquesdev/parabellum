"use client";

import { useEffect, useState } from "react";

export interface Branding {
  display_name: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string | null;
  favicon_url: string | null;
  support_email: string;
  terms_url: string | null;
  privacy_url: string | null;
  docs_url: string | null;
  is_custom: boolean;
}

const DEFAULT: Branding = {
  display_name: "Liberty CRM",
  primary_color: "#9aea62",
  secondary_color: "#000000",
  logo_url: null,
  favicon_url: null,
  support_email: "suporte@libertycrm.com.br",
  terms_url: null,
  privacy_url: null,
  docs_url: null,
  is_custom: false,
};

export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>(DEFAULT);

  useEffect(() => {
    const hostname = window.location.hostname;
    fetch(`/api/branding?hostname=${encodeURIComponent(hostname)}`)
      .then(r => r.json())
      .then(data => {
        setBranding({ ...DEFAULT, ...data });
        // Aplicar CSS vars
        document.documentElement.style.setProperty("--brand-primary", data.primary_color ?? "#9aea62");
        if (data.favicon_url) {
          const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
          if (link) link.href = data.favicon_url;
        }
      })
      .catch(() => {/* usa default */});
  }, []);

  return branding;
}
