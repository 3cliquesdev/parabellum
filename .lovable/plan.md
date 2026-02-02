
# Plano de Implementação: Integração Email Tracking → Playbook

## Objetivo
Corrigir integração Email Tracking → Playbook com 3 fixes:
1. **Buraco A**: Correlação `playbook_execution_id` + `playbook_node_id` em `email_sends`
2. **Buraco B**: Lock atômico do processador (claim com `FOR UPDATE SKIP LOCKED`)
3. **Buraco C**: Conditions `email_opened/email_clicked` validarem **apenas o email do nó informado** (evitar falso-positivo)

---

## Arquivos a Modificar

| Arquivo | Modificação |
|---------|-------------|
| **Migration SQL** | Adicionar colunas + índices + RPC `claim_playbook_queue_items` (CTE) |
| `supabase/functions/send-email/index.ts` | Interface + INSERT idempotente com fallback UPDATE |
| `supabase/functions/process-playbook-queue/index.ts` | Lock atômico via RPC + passar `node_id` + exigir `email_node_id` nas conditions |

---

## Etapa 1: Migration SQL

```sql
-- 1. Adicionar colunas de correlação playbook
ALTER TABLE public.email_sends
  ADD COLUMN IF NOT EXISTS playbook_execution_id uuid,
  ADD COLUMN IF NOT EXISTS playbook_node_id text;

-- 2. Índice para busca eficiente no condition  
CREATE INDEX IF NOT EXISTS idx_email_sends_playbook_exec_node
  ON public.email_sends(playbook_execution_id, playbook_node_id)
  WHERE playbook_execution_id IS NOT NULL;

-- 3. Índice único para resend_email_id (idempotência)
CREATE UNIQUE INDEX IF NOT EXISTS email_sends_resend_email_id_uidx
  ON public.email_sends(resend_email_id)
  WHERE resend_email_id IS NOT NULL;

-- 4. Índice para otimizar claim da fila
CREATE INDEX IF NOT EXISTS idx_playbook_queue_pending_sched
  ON public.playbook_execution_queue(status, scheduled_for)
  WHERE status = 'pending';

-- 5. Função para lock atômico via CTE
CREATE OR REPLACE FUNCTION public.claim_playbook_queue_items(batch_size int DEFAULT 10)
RETURNS SETOF public.playbook_execution_queue
LANGUAGE sql
AS $$
  WITH picked AS (
    SELECT id
    FROM public.playbook_execution_queue
    WHERE status = 'pending'
      AND scheduled_for <= now()
    ORDER BY scheduled_for, id
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.playbook_execution_queue q
  SET status = 'processing'
  FROM picked
  WHERE q.id = picked.id
  RETURNING q.*;
$$;

-- 6. Restringir acesso à função apenas para service_role
REVOKE ALL ON FUNCTION public.claim_playbook_queue_items(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_playbook_queue_items(int) TO service_role;
```

---

## Etapa 2: Atualizar `send-email/index.ts`

### Modificações:

**2.1 Adicionar campos na interface (linhas 9-20):**
- `playbook_node_id?: string;`
- `template_id?: string;`

**2.2 Extrair da request (linhas 39-50):**
- Adicionar `playbook_node_id` e `template_id` no destructuring

**2.3 Substituir INSERT por INSERT + fallback UPDATE (linhas 256-273):**

```typescript
const emailSendPayload = {
  contact_id: customer_id,
  resend_email_id: resendData.id,
  subject,
  recipient_email: to,
  status: 'sent',
  sent_at: new Date().toISOString(),
  variables_used: { to_name: recipientName, branding: brandName },
  playbook_execution_id: playbook_execution_id || null,
  playbook_node_id: playbook_node_id || null,
  template_id: request_template_id || null,
};

const { error: sendError } = await supabase.from('email_sends').insert(emailSendPayload);

// AJUSTE 2: Se já existe (conflito 23505), atualizar só campos de correlação quando NULL
if (sendError && sendError.code === '23505') {
  console.log('[send-email] Record exists, updating correlation fields if needed');
  await supabase
    .from('email_sends')
    .update({
      playbook_execution_id: emailSendPayload.playbook_execution_id,
      playbook_node_id: emailSendPayload.playbook_node_id,
      template_id: emailSendPayload.template_id,
    })
    .eq('resend_email_id', emailSendPayload.resend_email_id)
    .is('playbook_execution_id', null);
} else if (sendError) {
  console.warn('[send-email] Warning: Failed to insert email_sends:', sendError);
} else {
  console.log('[send-email] email_sends record created for tracking');
}
```

---

## Etapa 3: Atualizar `process-playbook-queue/index.ts`

### Modificações:

**3.1 Lock atômico via RPC (substituir linhas 47-66):**

Substituir o SELECT manual por chamada ao RPC:
```typescript
const { data: queueItems, error: queueError } = await supabaseAdmin.rpc(
  'claim_playbook_queue_items',
  { batch_size: 10 }
);
```

**3.2 REMOVER update de status para processing (linhas 77-81):**

O RPC já marca como 'processing', então remover este bloco.

**3.3 Passar `playbook_node_id` no email (linhas 340-349):**

Adicionar ao body do invoke:
```typescript
playbook_node_id: item.node_id,
template_id: emailData.template_id || null,
```

**3.4 Corrigir conditions `email_opened` e `email_clicked` (linhas 664-688):**

- Exigir `email_node_id` (se não vier → false)
- Adicionar filtro por `playbook_node_id`
- Logar sinal fraco vs forte

```typescript
case 'email_opened': {
  const emailNodeId = conditionData.email_node_id || 
                      conditionData.condition_value?.emailNodeId;
  
  if (!emailNodeId) {
    console.warn('[condition] email_opened sem email_node_id -> false (evita falso-positivo)');
    conditionResult = false;
    break;
  }
  
  const { data: emailSends } = await supabase
    .from('email_sends')
    .select('opened_at')
    .eq('playbook_execution_id', execution.id)
    .eq('playbook_node_id', emailNodeId)
    .not('opened_at', 'is', null)
    .limit(1);
  
  conditionResult = (emailSends?.length || 0) > 0;
  console.log(`⚠️ email_opened é sinal FRACO. Node: ${emailNodeId}, Result: ${conditionResult}`);
  break;
}

case 'email_clicked': {
  const emailNodeId = conditionData.email_node_id || 
                      conditionData.condition_value?.emailNodeId;
  
  if (!emailNodeId) {
    console.warn('[condition] email_clicked sem email_node_id -> false (evita falso-positivo)');
    conditionResult = false;
    break;
  }
  
  const { data: emailSends } = await supabase
    .from('email_sends')
    .select('clicked_at')
    .eq('playbook_execution_id', execution.id)
    .eq('playbook_node_id', emailNodeId)
    .not('clicked_at', 'is', null)
    .limit(1);
  
  conditionResult = (emailSends?.length || 0) > 0;
  console.log(`✅ email_clicked é sinal FORTE. Node: ${emailNodeId}, Result: ${conditionResult}`);
  break;
}
```

---

## Fluxo Final Corrigido

```text
1. Envia email (send-email)
   → INSERT em email_sends: resend_email_id, contact_id, playbook_execution_id, playbook_node_id
   → Se conflito 23505: UPDATE só campos de correlação quando NULL (idempotente)

2. Resend dispara webhook (delivered/opened/clicked)
   → email-webhook recebe
   → Atualiza email_sends: opened_at, clicked_at (já implementado)

3. Condition no playbook verifica:
   → email_clicked SEM email_node_id → false (evita falso-positivo)
   → email_clicked COM email_node_id → busca específica por execução + nó
   → Lock atômico previne processamento duplicado
```

---

## Critérios de Aceite

1. `email_sends` passa a gravar `playbook_execution_id` + `playbook_node_id` quando email é enviado por playbook
2. `claim_playbook_queue_items()` evita duplicidade mesmo com CRON rodando em paralelo
3. Condition `email_clicked` só retorna true quando **o email do nó específico** foi clicado
4. Retry do `send-email` não duplica `email_sends` (idempotência por `resend_email_id`)
5. Conditions consultam com `supabaseAdmin` (já é o caso - não quebra por RLS)

---

## Testes Recomendados

1. **Lock atômico:** Disparar processador 2x simultaneamente → verificar que cada item é processado 1x
2. **Correlação:** Disparar playbook com nó email → verificar se `email_sends` grava `playbook_node_id`
3. **Idempotência:** Retry do send-email → não duplica registro
4. **Condition sem node_id:** Condition `email_clicked` sem `email_node_id` → deve retornar false
5. **Condition com node_id:** Simular webhook clicked → condition deve retornar true apenas para o nó correto

---

## Seção Técnica

### Consultas de Teste Após Implementação

```sql
-- Verificar se emails do playbook estão salvando correlação
SELECT id, subject, playbook_execution_id, playbook_node_id, sent_at, opened_at, clicked_at
FROM email_sends
WHERE playbook_execution_id IS NOT NULL
ORDER BY sent_at DESC
LIMIT 10;

-- Email específico do nó X foi clicado?
SELECT clicked_at IS NOT NULL AS clicou
FROM email_sends 
WHERE playbook_execution_id = :execution_id
  AND playbook_node_id = :node_id;

-- Testar função de lock atômico
SELECT * FROM claim_playbook_queue_items(5);
```

### Configuração no Editor de Playbook

Para o nó Condition verificar um email específico:

```json
{
  "node_type": "condition",
  "data": {
    "condition_type": "email_clicked",
    "email_node_id": "email-1700000000000",
    "label": "Clicou no email de boas-vindas?"
  }
}
```
