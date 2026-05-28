"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tenant } from "@/types/database";

export function useTenant() {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: member } = await supabase
          .from("tenant_members")
          .select("tenant_id")
          .eq("user_id", user.id)
          .single() as { data: { tenant_id: string } | null; error: unknown };

        if (!member) return;

        const { data: tenantData } = await supabase
          .from("tenants")
          .select("*")
          .eq("id", member.tenant_id)
          .single() as { data: Tenant | null; error: unknown };

        setTenantId(member.tenant_id);
        setTenant(tenantData);
      } catch (e) {
        console.error("useTenant error:", e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { tenant, tenantId, loading };
}
