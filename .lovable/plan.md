

## Protecao da Janela de 24h do WhatsApp - Keep-Alive Inteligente (v2 Refinado)

### Objetivo
Enviar automaticamente uma mensagem contextual (ou segura) quando uma conversa WhatsApp estiver a 1 hora de perder a janela de 24h, evitando que a empresa perca a capacidade de contato.

---

### Criterios de Elegibilidade (query principal)

Uma conversa sera elegivel se **todas** as condicoes forem verdadeiras:

1. `conversations.status = 'open'` AND `conversations.channel = 'whatsapp'`
2. Ultima mensagem do **cliente** (`sender_type = 'contact'`) esta entre **23h e 24h** atras
3. Ultima mensagem da **empresa** (`sender_type = 'user'`) e **anterior** a ultima do cliente (empresa nao respondeu)
4. `conversations.window_keep_alive_sent_at IS NULL` (1 keep-alive por conversa ate cliente responder)
5. `conversations.ai_mode` NOT IN (`copilot`, `disabled`) -- humano no controle = nao envia
6. Contato **nao** marcado como `do_not_disturb` (nova coluna na tabela `contacts`)
7. Momento atual esta **dentro do horario comercial** (consulta `business_hours_config`)

---

### Protecoes Anti-Spam

| Protecao | Regra |
|----------|-------|
| Por conversa | Maximo 1 keep-alive ate o cliente responder novamente (campo `window_keep_alive_sent_at`) |
| Por cliente/dia | Maximo 1 keep-alive por `contact_id` por dia (24h rolling window via subquery) |
| Por execucao | Maximo **50 conversas** processadas por run do CRON (evitar burst) |
| Reset automatico | Quando cliente envia nova mensagem, `window_keep_alive_sent_at` e resetado para NULL (via trigger ou logica no webhook) |

---

### Logica de Mensagem: IA vs Segura

```text
Buscar ultimas 10 mensagens da conversa
  |
  v
Tem "ancoras" no historico?
(pedido, produto, problema, reclamacao, duvida tecnica)
  |
  SIM --> Chamar IA (google/gemini-2.5-flash) com contexto
  |         Prompt: "Gere follow-up curto e contextual"
  |         Max 2 frases
  |
  NAO --> Mensagem segura padrao:
          "Oi! Ainda estamos verificando sua solicitacao.
           Precisa de algo mais? Estamos aqui para ajudar."
```

**Deteccao de ancoras** (regex simples no historico):
- Palavras: `pedido|produto|entrega|problema|erro|compra|pagamento|duvida|reclamacao|suporte`
- Se >= 1 match = contexto suficiente para IA

---

### Governanca (alinhado com regras existentes)

| Regra | Comportamento |
|-------|---------------|
| Kill Switch OFF (`ai_global_enabled = false`) | Nao envia NADA (nem mensagem segura) |
| Shadow Mode (`ai_shadow_mode = true`) | Loga sugestao mas NAO envia |
| `ai_mode = autopilot` | IA gera resposta contextual (ou segura se sem ancoras) |
| `ai_mode = waiting_human` | Envia apenas mensagem segura padrao (sem IA) |
| `ai_mode = copilot` ou `disabled` | NAO envia (humano no controle) |
| `is_bot_message` | Sempre `true` em todos os envios |
| Fora do horario comercial | NAO envia (consulta `business_hours_config`) |
| `do_not_disturb = true` no contato | NAO envia |

---

### Auditoria Forte

Cada execucao gera um log estruturado na tabela `window_keeper_logs` (nova):

| Campo | Tipo | Descricao |
|-------|------|-----------|
| `id` | UUID | PK |
| `conversation_id` | UUID | FK conversations |
| `contact_id` | UUID | FK contacts |
| `trigger_reason` | TEXT | Qual regra disparou (ex: "last_contact_msg_23h_no_reply") |
| `message_content` | TEXT | Conteudo enviado |
| `message_source` | TEXT | `ai_generated` ou `safe_default` |
| `ai_model` | TEXT | Modelo usado (null se safe_default) |
| `ai_tokens_used` | INTEGER | Tokens consumidos |
| `ai_latency_ms` | INTEGER | Latencia da chamada IA |
| `provider` | TEXT | `meta` ou `evolution` |
| `success` | BOOLEAN | Se o envio foi bem-sucedido |
| `error_message` | TEXT | Erro se falhou |
| `skipped_reason` | TEXT | Se nao enviou, por que (kill_switch, shadow_mode, dnd, etc) |
| `created_at` | TIMESTAMPTZ | Momento da execucao |

**Metrica de eficacia**: Query posterior comparando `window_keeper_logs` com mensagens subsequentes do cliente (`sender_type = 'contact'` apos o keep-alive) para calcular taxa de resposta.

---

### Seguranca da Edge Function

A funcao `whatsapp-window-keeper` tera `verify_jwt = false` (necessario para CRON via pg_net), mas com protecao interna:

```text
1. Header obrigatorio: Authorization: Bearer SUPABASE_SERVICE_ROLE_KEY
2. Validacao no inicio da funcao:
   - Se header ausente ou invalido --> 401 Unauthorized
3. Alternativa: Secret interno (WINDOW_KEEPER_SECRET) verificado no header
```

Isso impede chamadas externas nao autorizadas, mesmo com JWT desabilitado.

---

### Detalhes Tecnicos

#### 1. Migracao SQL

- **Nova coluna** `conversations.window_keep_alive_sent_at` (TIMESTAMPTZ, nullable)
- **Nova coluna** `contacts.do_not_disturb` (BOOLEAN, default false)
- **Nova tabela** `window_keeper_logs` (auditoria completa, conforme schema acima)
- **Trigger** no webhook: quando cliente envia nova mensagem, resetar `window_keep_alive_sent_at = NULL`

#### 2. Nova Edge Function: `supabase/functions/whatsapp-window-keeper/index.ts`

Fluxo completo:

```text
1. Validar autorizacao (service_role_key no header)
2. Verificar Kill Switch (getAIConfig)
3. Verificar horario comercial (business_hours_config)
4. Query: buscar ate 50 conversas elegiveis
5. Para cada conversa:
   a. Verificar do_not_disturb do contato
   b. Verificar limite diario por contact_id
   c. Buscar ultimas 10 mensagens
   d. Detectar ancoras no historico
   e. Se ancoras + autopilot: chamar IA
   f. Se sem ancoras ou waiting_human: mensagem segura
   g. Enviar via send-meta-whatsapp (is_bot_message: true)
   h. Atualizar window_keep_alive_sent_at
   i. Registrar log completo em window_keeper_logs
6. Retornar resumo: total processado, enviados, skipped (por motivo)
```

#### 3. CRON Job

- Entrada no `config.toml` com schedule `*/5 * * * *`
- Chamada via pg_net com header de autorizacao

#### 4. Reset do keep-alive (no webhook existente)

- No `meta-whatsapp-webhook` e `handle-whatsapp-event`, quando mensagem do cliente chega:
  - Se `conversations.window_keep_alive_sent_at IS NOT NULL`, resetar para NULL
  - Isso permite um novo keep-alive no proximo ciclo de 24h

---

### Arquivos Criados/Modificados

1. **NOVO** `supabase/functions/whatsapp-window-keeper/index.ts` -- Edge function principal
2. **MIGRACAO SQL** -- Colunas `window_keep_alive_sent_at`, `do_not_disturb`, tabela `window_keeper_logs`, trigger de reset
3. **`supabase/config.toml`** -- Entrada para nova funcao com CRON
4. **`supabase/functions/meta-whatsapp-webhook/index.ts`** -- Adicionar reset de `window_keep_alive_sent_at` quando cliente envia mensagem
5. **`supabase/functions/handle-whatsapp-event/index.ts`** -- Mesmo reset (Evolution API)

### Impacto (Zero Regressao)

- Nova funcao isolada, nao altera logica existente de fluxos/IA/dispatch
- Novas colunas sao nullable, sem impacto em queries existentes
- Reset do keep-alive e uma unica linha adicional nos webhooks existentes
- Respeita todas as protecoes: Kill Switch, Shadow Mode, is_bot_message, horario comercial

