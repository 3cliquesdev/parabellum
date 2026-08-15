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
  display_name: "Parabellum",
  primary_color: "#9aea62",
  secondary_color: "#000000",
  logo_url: "/logo.png",
  favicon_url: null,
  support_email: "suporte@3cliques.net",
  terms_url: null,
  privacy_url: null,
  docs_url: null,
  is_custom: false,
};

export function useBranding(): Branding {
  return DEFAULT;
}
