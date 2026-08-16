"use client";

import { useEffect, useState, useCallback } from "react";
import type { Negocio } from "@/types/database";

export function useNegocios(tenantId: string | null, pipelineId: string | null) {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNegocios = useCallback(async () => {
    if (!tenantId || !pipelineId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/negocios?tenant_id=${tenantId}&pipeline_id=${pipelineId}`);
      if (res.ok) setNegocios((await res.json()).negocios ?? []);
    } catch (e) {
      console.error("useNegocios error:", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, pipelineId]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchNegocios();
    });
  }, [fetchNegocios]);

  return { negocios, loading, refetch: fetchNegocios };
}
