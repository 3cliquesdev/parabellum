

# Plano: Broadcast de Reengajamento para Fila da IA

## Situação Confirmada

| Métrica | Valor |
|---------|-------|
| Conversas na fila IA | **263** |
| Canal | WhatsApp |
| Provider | 100% Meta Cloud API |
| Dados disponíveis | `phone` e `whatsapp_id` em todos |

---

## Mensagem a Ser Enviada

```text
Olá! 👋 Sou a assistente virtual da 3Cliques. 

Tivemos uma instabilidade técnica e sua mensagem pode não ter sido respondida. 

Ainda precisa de atendimento? Responda aqui que já te ajudo! 🚀
```

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────┐
│                         INBOX                               │
│         Filtro: ai_queue (/inbox?filter=ai_queue)           │
├─────────────────────────────────────────────────────────────┤
│  [📢 Broadcast para Fila]  ← Novo botão (admin/manager)     │
└──────────────┬──────────────────────────────────────────────┘
               │ click
               ▼
┌─────────────────────────────────────────────────────────────┐
│            BroadcastAIQueueDialog                           │
├─────────────────────────────────────────────────────────────┤
│  • Exibe: "263 conversas serão notificadas"                 │
│  • Campo de texto editável com mensagem                     │
│  • Checkbox: [ ] Modo teste (não envia de verdade)          │
│  • Botões: [Cancelar] [Enviar Broadcast]                    │
└──────────────┬──────────────────────────────────────────────┘
               │ confirmar
               ▼
┌─────────────────────────────────────────────────────────────┐
│           Edge Function: broadcast-ai-queue                 │
├─────────────────────────────────────────────────────────────┤
│  1. Busca instância Meta ativa                              │
│  2. Busca conversas:                                        │
│     - ai_mode = 'autopilot'                                 │
│     - status = 'open'                                       │
│     - assigned_to IS NULL                                   │
│  3. Para cada conversa:                                     │
│     - Busca phone do contato                                │
│     - Envia via send-meta-whatsapp                          │
│     - Salva mensagem como sender_type = 'system'            │
│  4. Retorna relatório: {sent: X, failed: Y}                 │
└──────────────┬──────────────────────────────────────────────┘
               │ resposta do cliente
               ▼
┌─────────────────────────────────────────────────────────────┐
│  Webhook recebe → Fluxo/IA processa normalmente             │
└─────────────────────────────────────────────────────────────┘
```

---

## Alterações a Implementar

### 1. Nova Edge Function: `broadcast-ai-queue`

**Localização:** `supabase/functions/broadcast-ai-queue/index.ts`

**Parâmetros de entrada:**
```typescript
{
  message: string;           // Texto da mensagem
  dry_run?: boolean;         // Se true, simula sem enviar
  limit?: number;            // Limite de conversas (default: 500)
}
```

**Lógica:**
1. Buscar instância Meta ativa (`whatsapp_meta_instances.status = 'active'`)
2. Query nas conversas elegíveis
3. Para cada conversa:
   - Delay de 200ms entre envios (evitar throttling Meta)
   - Chamar `send-meta-whatsapp` com:
     - `instance_id`: da instância Meta
     - `phone_number`: do contato
     - `message`: texto do broadcast
     - `conversation_id`: para vincular
     - `skip_db_save: false` (salvar no histórico)
4. Retornar relatório

**Rate Limiting:**
- Delay de 200ms entre mensagens
- Máximo 500 por execução
- Timeout de 120s para a função

### 2. Componente UI: `BroadcastAIQueueDialog`

**Localização:** `src/components/inbox/BroadcastAIQueueDialog.tsx`

**Features:**
- Modal com preview da quantidade de destinatários
- Campo de texto editável (pré-preenchido com mensagem padrão)
- Toggle de modo teste (dry_run)
- Progress bar durante envio
- Resultado final: "X enviados, Y falhas"

### 3. Componente UI: `BroadcastAIQueueButton`

**Localização:** `src/components/inbox/BroadcastAIQueueButton.tsx`

**Features:**
- Botão "📢 Broadcast" visível apenas quando:
  - Filtro = `ai_queue`
  - Role = `admin`, `manager`, ou `general_manager`
- Abre o dialog de broadcast

### 4. Integração no Inbox

**Arquivo:** `src/pages/Inbox.tsx`

**Mudanças:**
- Importar `BroadcastAIQueueButton`
- Adicionar botão no header quando filtro = `ai_queue`
- Estado para controlar dialog

---

## Detalhes Técnicos

### Query de Conversas Elegíveis

```sql
SELECT 
  c.id as conversation_id,
  ct.phone,
  ct.whatsapp_id
FROM conversations c
JOIN contacts ct ON ct.id = c.contact_id
WHERE c.ai_mode = 'autopilot' 
  AND c.status = 'open' 
  AND c.assigned_to IS NULL
  AND ct.phone IS NOT NULL
LIMIT 500
```

### Formato da Mensagem Salva

```typescript
{
  conversation_id: string,
  content: mensagem,
  sender_type: 'system',
  metadata: {
    broadcast_id: uuid,
    broadcast_type: 'ai_queue_reengagement'
  }
}
```

---

## Segurança

| Controle | Implementação |
|----------|---------------|
| Autorização | Apenas `admin`, `manager`, `general_manager` |
| Rate Limit | 200ms entre envios, máx 500/execução |
| Audit Trail | Todas mensagens salvas com metadata `broadcast_type` |
| Dry Run | Modo teste para validar antes de enviar |
| Confirmação | Dialog obrigatório antes do envio |

---

## Arquivos a Criar

| Arquivo | Tipo |
|---------|------|
| `supabase/functions/broadcast-ai-queue/index.ts` | Edge Function |
| `src/components/inbox/BroadcastAIQueueButton.tsx` | Componente |
| `src/components/inbox/BroadcastAIQueueDialog.tsx` | Componente |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Inbox.tsx` | Adicionar botão no header da ai_queue |

---

## Fluxo de Uso

1. Admin acessa `/inbox?filter=ai_queue`
2. Vê botão "📢 Broadcast para Fila"
3. Clica e vê dialog com:
   - "263 conversas serão notificadas"
   - Mensagem editável
   - Opção de teste
4. Clica "Enviar Broadcast"
5. Progress bar mostra envio
6. Resultado: "263 enviados, 0 falhas"
7. Quando clientes respondem, IA processa normalmente

