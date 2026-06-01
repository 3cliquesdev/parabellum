"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

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

const PLATFORM_DOMAINS = ["liberty-crm-six.vercel.app", "localhost", "libertycrm.com.br"];

function applyBranding(data: Branding) {
  document.documentElement.style.setProperty("--brand-primary", data.primary_color ?? "#9aea62");
  if (data.favicon_url) {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null;
    if (link) link.href = data.favicon_url;
  }
}

export function useBranding(): Branding {
  const [branding, setBranding] = useState<Branding>(DEFAULT);

  useEffect(() => {
    const hostname = window.location.hostname;
    const isPlatform = !hostname || PLATFORM_DOMAINS.some(d => hostname === d || hostname.endsWith("." + d));

    if (!isPlatform) {
      // Domínio customizado da agência — lookup por hostname
      fetch(`/api/branding?hostname=${encodeURIComponent(hostname)}`)
        .then(r => r.json())
        .then(data => { setBranding({ ...DEFAULT, ...data }); applyBranding({ ...DEFAULT, ...data }); })
        .catch(() => {});
      return;
    }

    // Domínio da Liberty — tentar buscar pelo agency_id do usuário logado
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("agency_users")
        .select("agency_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()
        .then(({ data: agencyUser }: { data: any }) => {
          if (!agencyUser?.agency_id) return;
          fetch(`/api/branding?agency_id=${agencyUser.agency_id}`)
            .then(r => r.json())
            .then(data => {
              if (data.is_custom) {
                setBranding({ ...DEFAULT, ...data });
                applyBranding({ ...DEFAULT, ...data });
              }
            })
            .catch(() => {});
        });
    });
  }, []);

  return branding;
}
