"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface PresenceViewer {
  user_id: string;
  label: string;
}

/**
 * Presence do Supabase Realtime escopada so a conversa aberta no momento (nao
 * a lista inteira - evita 1 canal por linha em listas com 50+ conversas).
 * Mostra quem mais, alem de mim, esta com essa mesma conversa aberta agora.
 */
export function useConversaPresence(conversaId: string | null, myUserId: string | null, myLabel: string): PresenceViewer[] {
  const [viewers, setViewers] = useState<PresenceViewer[]>([]);

  useEffect(() => {
    setViewers([]);
    if (!conversaId || !myUserId) return;

    const supabase = createClient();
    const channel = supabase.channel(`presence-conversa-${conversaId}`, {
      config: { presence: { key: myUserId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<PresenceViewer>();
        const todos = Object.values(state).flat();
        setViewers(todos.filter((v) => v.user_id !== myUserId));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: myUserId, label: myLabel });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversaId, myUserId, myLabel]);

  return viewers;
}
