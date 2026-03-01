

# Auditoria Completa: Inbox + Motor de Fluxos

## Resultado Geral: Sistema saudável — 3 pontos de atenção, 0 bugs críticos

---

## 1. INBOX — Análise

### ✅ Tudo OK

| Componente | Status | Observação |
|---|---|---|
| **SuperComposer** | OK | Bloqueio `waiting_human` funcional; envio otimista com `sendInstant`; transcodificação de áudio para OGG |
| **Realtime (useInboxView)** | OK | 3 canais (inbox_view, messages, conversations); catch-up em reconexão; merge incremental; scope active/archived |
| **Realtime (useMessages)** | OK | Dedup por `client_message_id` (V2), `id`, `provider_message_id`, `external_id`; polling condicional; heartbeat 30s |
| **Envio Otimista (useSendMessageInstant)** | OK | UUID como `id` e `client_message_id`; fire-and-forget; cache atualizado antes da rede |
| **Paginação** | OK | `fetchOlderMessages` com cursor; `MESSAGES_PAGE_SIZE = 50` |
| **Filtros Sidebar** | OK | Todas, Minhas, SLA, Não atribuídas, Fila IA/Humana, Departamentos, Tags, Por Atendente |
| **Contagens** | OK | Via edge function `get-inbox-counts`; refetch a cada 60s; invalidação via realtime |
| **Role-based Access** | OK | Filtro no banco por role (sales_rep, consultant, etc.); `hasFullInboxAccess` para admin/manager |
| **Edge Function Logs** | OK | `dispatch-conversations`, `get-inbox-counts`, `send-email` — sem erros nos logs recentes |

### ⚠️ Ponto de Atenção 1: Função `detectMediaType` duplicada no SuperComposer

**Severidade: Baixa** — Cosmético, sem impacto funcional.

O `SuperComposer.tsx` tem 3 funções quase idênticas: `detectMediaType` (linha 301), `detectMetaMediaType` (linha 309) e `getMetaMediaType` (linha 317). Todas fazem a mesma coisa. Apenas `getMetaMediaType` e `detectMediaType` são usadas.

**Recomendação:** Consolidar em uma única função. Não causa bugs, mas polui o código.

### ⚠️ Ponto de Atenção 2: Preload FFmpeg duplicado no SuperComposer

**Severidade: Nenhuma** — Inofensivo.

Dois `useEffect` fazem `preloadFFmpeg()` (linhas 91-101 e 203-210). O segundo é redundante mas não causa problemas pois `preloadFFmpeg` é idempotente.

---

## 2. MOTOR DE FLUXOS (process-chat-flow) — Análise

### ✅ Bug anterior corrigido

A referência a `rebuildVariablesContext` (linha 1289) foi corrigida na última sessão para `rebuildCtx()`. Confirmado no código atual.

### ✅ Tudo OK

| Área | Status |
|---|---|
| Kill Switch (`ai_global_enabled`) | Bloqueia corretamente |
| `ask_options` validação estrita | Match por número ou texto exato |
| Anti-duplicação IA (janela 5s) | Implementado |
| Trava financeira (`forbid_financial`) | `forceFinancialExit` sem hard transfer |
| Exit keywords | Case-insensitive — correto |
| Max interactions → próximo nó | Correto |
| Auto-travessia de nós sem conteúdo | Com limite de steps |
| Cleanup de estados duplicados | Funcional |
| `rebuildCtx` após auto-validação | **Corrigido** ✅ |

### ⚠️ Ponto de Atenção 3: `minMatches` hardcoded = 1 (ainda pendente)

Linha 2063: `const minMatches = essentialKeywords.length <= 1 ? 1 : 1;` — continua sempre resultando em `1`. Funciona, mas pode gerar falsos positivos em triggers com muitas keywords. Mantido como conservador conforme decisão anterior.

---

## 3. EDGE FUNCTIONS EM PRODUÇÃO — Logs Recentes

| Function | Status | Última Atividade |
|---|---|---|
| `dispatch-conversations` | ✅ Rodando | Nenhum job pendente; 5 departamentos verificados, nenhum agente online |
| `get-inbox-counts` | ✅ Rodando | 37 conversas ativas, 8 não respondidas, SLA calculado |
| `send-email` | ✅ Rodando | Email enviado com sucesso via Resend |
| `process-playbook-queue` | ✅ Rodando | 1 item processado, 0 falhas |
| `email-webhook` | ✅ Rodando | Assinatura verificada, evento processado |

---

## Conclusão

O sistema está **operacional e sem bugs críticos**. As 3 observações são de baixa prioridade:

1. Funções duplicadas de detecção de mídia no SuperComposer (cosmético)
2. Preload FFmpeg duplicado (inofensivo)
3. `minMatches` hardcoded (decisão conservadora já tomada)

Nenhuma correção urgente necessária. O bug do `rebuildCtx` da sessão anterior está confirmado como corrigido.

