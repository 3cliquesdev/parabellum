"use client";

import { useEffect, useState, useCallback } from "react";
import type { Pipeline } from "@/types/database";

export function usePipelines(tenantId: string | null) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPipelines = useCallback(async () => {
    if (!tenantId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/pipelines?tenant_id=${tenantId}`);
      if (res.ok) setPipelines((await res.json()).pipelines ?? []);
    } catch (e) {
      console.error("usePipelines error:", e);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchPipelines();
    });
  }, [fetchPipelines]);

  return { pipelines, loading, refetch: fetchPipelines };
}
