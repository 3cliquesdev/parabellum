

# Auditoria do Fluxo — Diagnóstico Completo

Analisei o projeto atual e sigo as regras da base de conhecimento.

---

## Erro Crítico Encontrado: Conversas Reabertas NÃO Resetam `ai_mode`

### O Problema

O ROUTING-LOCK v2.0 (implementado na mensagem anterior) corrigiu a criação de **novas** conversas — agora sempre iniciam em `autopilot`. Porém, **conversas existentes que são reabertas** (cliente retornante com conversa anterior) **mantêm o `ai_mode` antigo**.

**Fluxo atual (bugado):**

```text
Cliente retornante manda mensagem
  → Conversa EXISTENTE encontrada (status: closed, ai_mode: copilot)
  → Webhook atualiza: status=open, whatsapp_provider=meta
  → NÃO reseta ai_mode (continua "copilot")
  → process-chat-flow vê ai_mode=copilot → retorna skipAutoResponse
  → Webhook não chama IA nem fluxo → conversa fica muda
```

**Onde está o bug:** `meta-whatsapp-webhook/index.ts` linhas 598-613. Quando reabre uma conversa existente, atualiza apenas `whatsapp_provider`, `last_message_at` e `status`, mas **não toca em `ai_mode`**.

### A Correção

Na seção de reopen de conversa existente (linhas 598-613), adicionar lógica para:

1. **Se conversa estava `closed`**: resetar `ai_mode` para `autopilot`
2. **Manter `assigned_to`** se consultor vinculado (mesma lógica do ROUTING-LOCK v2.0)
3. **NÃO resetar** se conversa está `open` com agente ativo (conversa em andamento)

```typescript
// ANTES (bugado):
await supabase.from("conversations").update({ 
  whatsapp_provider: "meta",
  whatsapp_meta_instance_id: instance.id,
  whatsapp_instance_id: null,
  last_message_at: new Date().toISOString(),
  status: "open"
}).eq("id", conversation.id);

// DEPOIS (corrigido):
const reopenUpdate: Record<string, any> = {
  whatsapp_provider: "meta",
  whatsapp_meta_instance_id: instance.id,
  whatsapp_instance_id: null,
  last_message_at: new Date().toISOString(),
  status: "open",
};

// Se conversa estava fechada, resetar ai_mode para autopilot
// para que Master Flow/IA possa assumir novamente
if (conversation.status === "closed") {
  reopenUpdate.ai_mode = "autopilot";
  console.log("[meta-whatsapp-webhook] 🔄 Conversa reaberta: ai_mode resetado para autopilot");
}

await supabase.from("conversations")
  .update(reopenUpdate)
  .eq("id", conversation.id);
```

### Impacto da Correção
- **Zero regressão**: conversas abertas em andamento não são afetadas
- **Resolve o bug principal**: conversas reabertas passam pelo Master Flow normalmente
- **Compatível com ROUTING-LOCK v2.0**: consultor pré-atribuído continua intacto
- **Rollback**: reverter 1 bloco de código no webhook

---

## Outros Achados (Não-Críticos)

| Item | Severidade | Status |
|---|---|---|
| `analyze-ticket` retornando 429 (rate limited) | Média | Limitação do plano Lovable — fallback para "neutral" está funcionando corretamente |
| `email_sends` faltando coluna `delivered_at` | Baixa | Afeta apenas tracking de email, não o fluxo de conversas |
| `useMyPendingCounts.tsx` usando `id` ao invés de `conversation_id` | Média | Causa erro 400 nos contadores do inbox (já diagnosticado anteriormente) |

---

## Resumo

O fluxo do motor está **íntegro** — `process-chat-flow`, Master Flow, soberania, anti-duplicação, exit keywords, tudo funciona. O problema é que conversas reabertas chegam ao motor com `ai_mode` errado (`copilot`/`waiting_human` da sessão anterior), e o motor corretamente bloqueia a automação nesses modos. A correção é resetar o `ai_mode` para `autopilot` no momento da reabertura.

