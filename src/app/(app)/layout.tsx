"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/app/Sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[2]) : null;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [impersonation, setImpersonation] = useState<{ tenantName: string; agencyName: string } | null>(null);

  useEffect(() => {
    const cookie = getCookie("impersonation_session");
    if (cookie) {
      try {
        const data = JSON.parse(cookie);
        if (data.tenant_name && data.agency_name) {
          setImpersonation({ tenantName: data.tenant_name, agencyName: data.agency_name });
        }
      } catch { /* cookie inválido */ }
    }
  }, []);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      {impersonation && (
        <ImpersonationBanner
          tenantName={impersonation.tenantName}
          agencyName={impersonation.agencyName}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto crm-main">
          {children}
        </main>
      </div>
    </div>
  );
}
