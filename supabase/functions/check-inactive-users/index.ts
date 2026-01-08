import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tempo de inatividade para marcar como offline (5 minutos)
const INACTIVITY_THRESHOLD_MINUTES = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    console.log("[check-inactive-users] Starting inactive users check");

    // Calcular timestamp de corte (5 minutos atrás)
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - INACTIVITY_THRESHOLD_MINUTES);
    const cutoffTimestamp = cutoffTime.toISOString();

    console.log(`[check-inactive-users] Cutoff time: ${cutoffTimestamp}`);

    // Buscar usuários online/busy que não atualizaram há mais de 5 minutos
    const { data: inactiveUsers, error: selectError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, availability_status, last_status_change")
      .in("availability_status", ["online", "busy"])
      .lt("last_status_change", cutoffTimestamp);

    if (selectError) {
      console.error("[check-inactive-users] Error fetching inactive users:", selectError);
      throw selectError;
    }

    console.log(`[check-inactive-users] Found ${inactiveUsers?.length || 0} inactive users`);

    let redistributedConversations = 0;

    if (inactiveUsers && inactiveUsers.length > 0) {
      const userIds = inactiveUsers.map(u => u.id);
      
      console.log("[check-inactive-users] Users to mark offline:", inactiveUsers.map(u => ({
        name: u.full_name,
        lastSeen: u.last_status_change,
      })));

      // Marcar todos como offline
      const { error: updateError } = await supabaseAdmin
        .from("profiles")
        .update({ 
          availability_status: "offline",
          last_status_change: new Date().toISOString(),
        })
        .in("id", userIds);

      if (updateError) {
        console.error("[check-inactive-users] Error updating users:", updateError);
        throw updateError;
      }

      console.log(`[check-inactive-users] Marked ${userIds.length} users as offline`);

      // 🆕 REDISTRIBUIÇÃO: Buscar conversas abertas dos agentes que ficaram offline
      for (const offlineUser of inactiveUsers) {
        const { data: orphanedConversations, error: convError } = await supabaseAdmin
          .from("conversations")
          .select("id, contact_id, ai_mode")
          .eq("assigned_to", offlineUser.id)
          .in("status", ["open", "pending"]);

        if (convError) {
          console.error(`[check-inactive-users] Error fetching conversations for ${offlineUser.id}:`, convError);
          continue;
        }

        if (!orphanedConversations || orphanedConversations.length === 0) {
          continue;
        }

        console.log(`[check-inactive-users] ${offlineUser.full_name} tinha ${orphanedConversations.length} conversas ativas`);

        // Buscar agentes online disponíveis (exceto o que ficou offline)
        const { data: onlineAgents } = await supabaseAdmin
          .from("profiles")
          .select("id, full_name")
          .eq("availability_status", "online")
          .in("role", ["admin", "agent", "consultant"])
          .neq("id", offlineUser.id);

        if (onlineAgents && onlineAgents.length > 0) {
          // Distribuir para agentes online (round-robin simples)
          let agentIndex = 0;
          
          for (const conv of orphanedConversations) {
            const targetAgent = onlineAgents[agentIndex % onlineAgents.length];
            
            const { error: reassignError } = await supabaseAdmin
              .from("conversations")
              .update({ 
                assigned_to: targetAgent.id,
                previous_agent_id: offlineUser.id,
                ai_mode: "waiting_human"
              })
              .eq("id", conv.id);

            if (reassignError) {
              console.error(`[check-inactive-users] Error reassigning conversation ${conv.id}:`, reassignError);
              continue;
            }

            // Mensagem de sistema
            await supabaseAdmin.from("messages").insert({
              conversation_id: conv.id,
              content: `🔄 ${offlineUser.full_name} ficou offline. ${targetAgent.full_name} assumiu a conversa.`,
              sender_type: "system",
              channel: "web_chat"
            });

            agentIndex++;
            redistributedConversations++;
            console.log(`[check-inactive-users] Conversa ${conv.id} transferida para ${targetAgent.full_name}`);
          }
        } else {
          // Nenhum agente online: mover para pool geral com IA
          console.log("[check-inactive-users] Nenhum agente online - conversas voltam para IA");
          
          for (const conv of orphanedConversations) {
            const { error: poolError } = await supabaseAdmin
              .from("conversations")
              .update({ 
                assigned_to: null,
                previous_agent_id: offlineUser.id,
                ai_mode: "autopilot"
              })
              .eq("id", conv.id);

            if (poolError) {
              console.error(`[check-inactive-users] Error moving conversation ${conv.id} to pool:`, poolError);
              continue;
            }

            // Adicionar à fila de espera
            await supabaseAdmin.from("conversation_queue").upsert({
              conversation_id: conv.id,
              priority: 1, // Prioridade alta pois estava em atendimento
              queued_at: new Date().toISOString()
            }, { onConflict: "conversation_id" });

            // Mensagem de sistema
            await supabaseAdmin.from("messages").insert({
              conversation_id: conv.id,
              content: "🤖 Nenhum atendente disponível no momento. A IA está aqui para ajudar enquanto aguardamos um especialista.",
              sender_type: "system",
              channel: "web_chat"
            });

            redistributedConversations++;
            console.log(`[check-inactive-users] Conversa ${conv.id} movida para pool geral`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        usersMarkedOffline: inactiveUsers?.length || 0,
        conversationsRedistributed: redistributedConversations,
        cutoffTime: cutoffTimestamp,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[check-inactive-users] Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});