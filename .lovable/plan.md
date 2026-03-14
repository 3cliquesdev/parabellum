

# Auditoria Total do Sistema — 14/03/2026

## Status Geral: 95% Operacional

---

## VERIFICACOES OK (Sem Acao Necessaria)

| Sistema | Status | Detalhes |
|---|---|---|
| Guards resposta vazia (ai-autopilot-chat) | OK | Guard 1 (callStrictRAG L4243) + Guard 2 (strictResponse L4940) + Guard Final (assistantMessage L9250) |
| Email Webhook | OK | Aceita `contact_id` e `customer_id` (fallback). Log confirmado operacional |
| Conversas orfas | OK | 0 conversas waiting_human sem dispatch job |
| RLS message_buffer | OK | 2 policies ativas |
| Inline OTP (ai_response) | OK | Interceptor (L4228) + Maquina de estados (L3022-3250) implementados corretamente |
| Fluxo V4 edges | OK | Edges orfas removidas na auditoria anterior |
| Base de Conhecimento | OK | 211 artigos, 15 categorias |
| Pipeline de emails | OK | send-email + email-webhook + playbook-queue funcionais |
| Pipeline WhatsApp Meta | OK | Batching, buffer, HMAC signature OK |
| Dispatch system | OK | Agentes offline (normal fora do horario) |

---

## BUG ATIVO: 4 Mensagens Vazias em 7 Dias (PRIORIDADE ALTA)

**Evidencia:** 4 mensagens com `content=''` (len=0), `status=sent`, `is_ai_generated=true`, todas do mesmo contato (Ronildo Oliveira), canal WhatsApp.

**Causa raiz:** O Guard Final na L9250 do `ai-autopilot-chat` protege apenas o caminho principal (`message_type: ai_response`). Porem existem **3 caminhos alternativos** que inserem mensagens sem guard de conteudo vazio:

1. **`process-buffered-messages` L614-620** (`handleFlowReInvoke`): Insere `flowMessage = flowResult.response || flowResult.message` — se ambos forem `undefined`, `flowMessage` sera `undefined` e o guard `if (flowMessage && ...)` bloqueia. Mas se for string vazia `""`, o guard falha pois `""` e falsy... Na verdade isso deveria funcionar. O bug provavelmente vem de:

2. **`process-chat-flow`**: Ao retornar `response: ""` em algum caminho de retorno (por exemplo, quando o OTP inline ou outro handler retorna sem definir `response`).

3. **`handle-whatsapp-event` L1263**: Insere `content: flowResult.response` diretamente sem verificar se esta vazio.

**Correcao:** Adicionar guard `if (!content || content.trim().length === 0) return;` antes de cada INSERT em mensagens nos 3 arquivos acima.

---

## SEGURANCA: 18 Funcoes SECURITY DEFINER sem search_path

Funcoes custom com `SECURITY DEFINER = true` mas sem `SET search_path = public`:

- `calculate_lead_score`
- `check_submission_limit`
- `cleanup_expired_insights_cache`
- `get_avg_first_response_time`
- `get_avg_resolution_time`
- `get_commercial_conversations_drilldown` (2x overloads)
- `get_commercial_conversations_kpis`
- `get_commercial_conversations_pivot`
- `get_commercial_conversations_report`
- `get_consultant_contact_ids`
- `get_copilot_health_score`
- `get_support_dashboard_counts`
- `redistribute_on_agent_offline`
- `sync_consultant_to_open_conversations`
- `trigger_calculate_lead_score`
- `trigger_dispatch_on_insert`
- `trigger_generate_embedding`

**Risco:** Search path injection em funcoes com privilegios elevados.

**Correcao:** Uma migration SQL aplicando `ALTER FUNCTION ... SET search_path = public` em todas as 18.

---

## SEGURANCA: 1 Security Definer View

Uma view com SECURITY DEFINER (provavelmente `inbox_view`). Risco baixo pois e intencional para performance da inbox.

---

## LINTER: 65 Issues (Reducao de 93 para 65)

- 1 ERROR: Security Definer View (intencional)
- ~46 WARN: Function Search Path Mutable (18 custom + ~28 de extensoes pgvector/pgmq/trgm)
- ~18 WARN: Residuais de extensoes externas (nao acionaveis)

---

## PLANO DE CORRECAO

### Sprint 1: Fix Mensagens Vazias (BUG ATIVO)
1. **`handle-whatsapp-event/index.ts` L1263**: Adicionar guard antes do insert
2. **`process-buffered-messages/index.ts` L614**: Adicionar guard antes do insert  
3. **`process-chat-flow/index.ts`**: Auditar todos os 25 pontos de insert para guards

### Sprint 2: Hardening SQL
4. **Migration**: Aplicar `SET search_path = public` nas 18 funcoes SECURITY DEFINER

---

**Resultado esperado:** 0 mensagens vazias + linter reduzido de 65 para ~47 issues (residuais de extensoes).

