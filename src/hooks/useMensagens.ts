"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mensagem } from "@/types/database";

export function useMensagens(conversaId: string | null) {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMensagens = useCallback(async () => {
    if (!conversaId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("mensagens")
        .select("*")
        .eq("conversa_id", conversaId)
        .order("created_at", { ascending: true });
      setMensagens((data as Mensagem[]) ?? []);
    } catch (e) {
      console.error("useMensagens:", e);
    } finally {
      setLoading(false);
    }
  }, [conversaId]);

  useEffect(() => {
    fetchMensagens();

    if (!conversaId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`mensagens-${conversaId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "mensagens",
        filter: `conversa_id=eq.${conversaId}`,
      }, (payload) => {
        setMensagens(prev => [...prev, payload.new as Mensagem]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversaId, fetchMensagens]);

  return { mensagens, loading, refetch: fetchMensagens };
}
