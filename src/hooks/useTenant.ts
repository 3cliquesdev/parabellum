"use client";

import { useEffect, useState } from "react";
import type { Tenant } from "@/types/database";

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/tenant/current", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { tenant?: Tenant | null; role?: string | null };
        setTenantId(payload.tenant?.id ?? null);
        setTenant(payload.tenant ?? null);
        setRole(payload.role ?? null);
      } catch (e) {
        console.error("useTenant error:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { tenant, tenantId, role, loading };
}
