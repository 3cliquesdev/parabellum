"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/types/database";

export function useLeads(tenantId: string | null) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    if (!tenantId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false });
    setLeads((data as Lead[]) ?? []);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, loading, refetch: fetchLeads };
}

export function useUpdateLeadStatus() {
  const updateStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    const supabase = createClient();
    await supabase.from("leads").update({ status }).eq("id", leadId);
  }, []);
  return { updateStatus };
}

export function useCreateLead() {
  const createLead = useCallback(async (data: Partial<Lead>) => {
    const supabase = createClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .insert(data)
      .select()
      .single();
    return { lead: lead as Lead | null, error };
  }, []);
  return { createLead };
}
