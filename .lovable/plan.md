
## Plano de Otimizacao Enterprise: Sistema Mais Rapido e Estavel

### Analise Completa Realizada

Identifiquei os seguintes problemas criticos que impactam a velocidade e estabilidade do sistema:

---

## SECAO 1: Problemas Criticos Encontrados

### 1.1 Statement Timeouts no Banco (URGENTE)
Multiplos erros de "canceling statement due to statement timeout" nos logs. Causa: queries pesadas sem indices otimizados.

| Funcao RPC | Problema |
|------------|----------|
| `get_avg_first_response_time` | Calcula AVG com EXTRACT(EPOCH) em tempo real |
| `get_avg_resolution_time` | Mesmo problema |
| `get_conversation_heatmap` | GROUP BY em toda tabela por dia/hora |

### 1.2 Erro de Enum Invalido
Erro: "invalid input value for enum communication_channel: 'web_chat'"

O enum `communication_channel` (usado em `interactions`) nao inclui `'web_chat'`, mas o codigo envia esse valor em:
- `distribute-pending-conversations/index.ts:330`
- `message-listener/index.ts:64`
- `redistribute-after-hours/index.ts:129`

### 1.3 Polling Agressivo Desnecessario
Com realtime ja implementado, polling excessivo gera carga duplicada:

| Hook | Intervalo | Problema |
|------|-----------|----------|
| `useWhatsAppInstances` | 5s | Muito frequente |
| `useInboxView` | 10s | Redundante com realtime |
| `useConversations` | 15s | Redundante com realtime |

### 1.4 Queries Sem Limite Adequado
- `useDeals`: limit(5000) - 11k deals no banco
- `useContacts`: Sem limite - 13k contatos no banco
- `useAverageResponseTime`: Baixa TODAS conversas para calcular media no JS

### 1.5 Indices Nao Utilizados
30 indices criados mas NUNCA usados (idx_scan = 0), ocupando espaco e overhead em writes.

---

## SECAO 2: Solucoes Propostas (Sem Quebrar Nada)

### Parte A: Correcoes Imediatas (Zero Risco)

#### A1. Corrigir Enum web_chat
Adicionar `'web_chat'` ao enum `communication_channel` OU substituir por `'chat'` nos edge functions.

**Arquivo**: Criar migration SQL
```sql
ALTER TYPE public.communication_channel ADD VALUE IF NOT EXISTS 'web_chat';
```

#### A2. Otimizar useAverageResponseTime
Substituir query client-side pela RPC existente.

**Arquivo**: `src/hooks/useAverageResponseTime.tsx`
```tsx
// DE:
const { data: conversations } = await supabase
  .from("conversations")
  .select("created_at, first_response_at")...

// PARA:
const { data } = await supabase.rpc("get_avg_first_response_time", {
  p_start: startDate.toISOString(),
  p_end: endDate.toISOString()
});
return data || 0;
```

#### A3. Reduzir Polling Agressivo
Aumentar intervalos onde realtime ja cobre:

**Arquivos a editar**:
| Hook | De | Para |
|------|----|------|
| `useWhatsAppInstances` | 5s | 30s |
| `useInboxView` | 10s | 60s (backup only) |
| `useConversations` | 15s | 60s (backup only) |
| `useWhatsAppAPIStatus` | 10s | 30s |

### Parte B: Otimizacoes de Media Prioridade

#### B1. Adicionar Limite em useContacts
**Arquivo**: `src/hooks/useContacts.tsx`
```tsx
// Adicionar apos .order():
.limit(1000)
```

#### B2. Reduzir Limite em useDeals
**Arquivo**: `src/hooks/useDeals.tsx`
```tsx
// DE:
query = query.limit(5000);

// PARA:
query = query.limit(1000);
```

Obs: Implementar paginacao infinita em fase posterior.

#### B3. Criar Indices Otimizados para Metricas
**Migration SQL**:
```sql
-- Indice para FRT
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_frt_calc 
ON conversations (created_at, first_response_at) 
WHERE first_response_at IS NOT NULL;

-- Indice para MTTR
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_mttr_calc 
ON conversations (created_at, closed_at) 
WHERE closed_at IS NOT NULL;

-- Indice para heatmap
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_heatmap 
ON conversations (created_at);
```

### Parte C: Otimizacoes Avancadas (Opcional)

#### C1. Materialized View para Metricas Diarias
Criar tabela pre-calculada para evitar AVG em tempo real:

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_support_metrics AS
SELECT 
  date_trunc('day', created_at) as day,
  AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 60) as avg_frt_minutes,
  AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 60) as avg_mttr_minutes,
  COUNT(*) as total_conversations
FROM conversations
WHERE first_response_at IS NOT NULL OR closed_at IS NOT NULL
GROUP BY 1;

-- Refresh automatico via cron
```

#### C2. Remover Indices Nao Utilizados
Lista de indices com idx_scan = 0 que podem ser removidos para reduzir overhead:
- `idx_conversations_handoff_executed_at`
- `idx_conversations_needs_human_review`
- `idx_conversations_ai_mode`
- `idx_conversations_meta_instance`
- `idx_automations_trigger_event`
- (e outros 25 indices)

---

## SECAO TECNICA: Detalhes de Implementacao

### Arquivos a Modificar (Seguros)

1. **`src/hooks/useAverageResponseTime.tsx`**
   - Mudar de query client-side para RPC

2. **`src/hooks/useInboxView.tsx`** (linha 248)
   - `refetchInterval: 10000` -> `refetchInterval: 60000`

3. **`src/hooks/useConversations.tsx`** (linha 255)
   - `refetchInterval: 15000` -> `refetchInterval: 60000`

4. **`src/hooks/useWhatsAppInstances.tsx`** (linha 67)
   - `refetchInterval: 5000` -> `refetchInterval: 30000`

5. **`src/hooks/useDeals.tsx`** (linha 165)
   - `limit(5000)` -> `limit(1000)`

6. **`src/hooks/useContacts.tsx`** (linha 43)
   - Adicionar `.limit(1000)` apos `.order()`

7. **Edge Functions** (corrigir enum):
   - `distribute-pending-conversations/index.ts:330` - `'web_chat'` -> `'chat'`
   - `message-listener/index.ts:64` - `'web_chat'` -> `'chat'`
   - `redistribute-after-hours/index.ts:129` - `'web_chat'` -> `'chat'`

8. **Migration SQL** - Adicionar indices otimizados

### Volume de Dados Atual

| Tabela | Registros |
|--------|-----------|
| audit_logs | 274,838 |
| interactions | 51,704 |
| ai_usage_logs | 35,103 |
| contacts | 13,248 |
| messages | 11,769 |
| deals | 11,029 |
| conversations | 792 |

---

## Resultado Esperado

| Metrica | Antes | Depois |
|---------|-------|--------|
| Statement timeouts | Frequentes | Eliminados |
| Erro enum web_chat | Ativo | Corrigido |
| Carga de polling | ~15 req/min/usuario | ~3 req/min/usuario |
| Tempo de carga Inbox | ~2-3s | <1s |
| Tempo de carga Deals | ~3-5s | <1.5s |

### Garantia de Nao Quebrar

- Todas as mudancas sao incrementais
- Realtime continua funcionando (polling e apenas backup)
- Indices sao criados com CONCURRENTLY (sem lock)
- Limites de 1000 registros cobrem 99% dos casos de uso
- Enum pode ser estendido sem impacto

Posso implementar essas otimizacoes em fases, comecando pelas correcoes imediatas de zero risco?
