"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConversaEvento } from "@/types/database";

export function useConversaEventos(conversaId: string | null) {
  const [eventos, setEventos] = useState<ConversaEvento[]>([]);

  const fetchEventos = useCallback(async () => {
    if (!conversaId) { setEventos([]); return; }
    const supabase = createClient();
    const { data } = await supabase
      .from("conversa_eventos")
      .select("*")
      .eq("conversa_id", conversaId)
      .order("criado_em", { ascending: true });
    setEventos((data as unknown as ConversaEvento[]) ?? []);
  }, [conversaId]);

  useEffect(() => {
    queueMicrotask(() => void fetchEventos());
    if (!conversaId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`conversa-eventos-${conversaId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "conversa_eventos",
        filter: `conversa_id=eq.${conversaId}`,
      }, (payload) => {
        setEventos((prev) => [...prev, payload.new as ConversaEvento]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversaId, fetchEventos]);

  return { eventos };
}
