
# Plano: Implementar SLA Dinâmico no Inbox (Enterprise)

## Diagnóstico Confirmado

### Problema Atual
O campo `inbox_view.sla_status` é **estático** - calculado apenas no momento do INSERT/UPDATE da mensagem e **nunca é recalculado** com o passar do tempo.

### Impacto
| Componente | Problema |
|------------|----------|
| Badge "SLA Excedido" | Sempre mostra 0 (lê `sla_status = 'critical'` estático) |
| Lista "SLA Excedido" | Sempre vazia (filtra por `sla_status = 'critical'`) |
| Conversas 44h+ sem resposta | Aparecem como "OK" no banco |

### Código Problemático

**Edge Function `get-inbox-counts` (linhas 227-228):**
```typescript
// ❌ PROBLEMA: Usa campo estático que nunca muda
const slaCritical = inbox.filter((i: any) => i.sla_status === "critical").length;
const slaWarning = inbox.filter((i: any) => i.sla_status === "warning").length;
```

**Hook `useInboxView` (linhas 149-152):**
```typescript
// ❌ PROBLEMA: Filtra pelo campo estático
if (filters.slaStatus) {
  result = result.filter(item => item.sla_status === filters.slaStatus);
}
```

**Inbox.tsx (linhas 334-336):**
```typescript
// ❌ PROBLEMA: Filtro SLA não faz nada - só retorna tudo
case "sla":
  return result.filter(c => c.status !== 'closed');
```

---

## Solução: SLA Calculado Dinamicamente

### Regras de SLA (Enterprise)
```
SLA Critical (≥4h): 
  status = 'open' 
  AND last_sender_type = 'contact' 
  AND (now - last_message_at) >= 4 horas

SLA Warning (1h-4h):
  status = 'open'
  AND last_sender_type = 'contact'
  AND (now - last_message_at) >= 1 hora
  AND (now - last_message_at) < 4 horas
```

---

## Implementação em 4 Etapas

### Etapa 1: Edge Function `get-inbox-counts` (Badge)

**Arquivo:** `supabase/functions/get-inbox-counts/index.ts`

Substituir cálculo estático por **SQL dinâmico** (eficiência enterprise):

```typescript
// DEPOIS: Queries SQL otimizadas (sem trazer dados desnecessários)
const [slaCriticalRes, slaWarningRes] = await Promise.all([
  // SLA Critical: ≥4h sem resposta do agente
  supabaseAdmin
    .from("inbox_view")
    .select("conversation_id", { count: "exact", head: true })
    .eq("status", "open")
    .eq("last_sender_type", "contact")
    .lt("last_message_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()),
  
  // SLA Warning: 1h-4h sem resposta
  supabaseAdmin
    .from("inbox_view")
    .select("conversation_id", { count: "exact", head: true })
    .eq("status", "open")
    .eq("last_sender_type", "contact")
    .lt("last_message_at", new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString())
    .gte("last_message_at", new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()),
]);

const slaCritical = slaCriticalRes.count ?? 0;
const slaWarning = slaWarningRes.count ?? 0;
```

### Etapa 2: Criar Hook Dedicado `useSlaExceededItems`

**Arquivo:** `src/hooks/useSlaExceededItems.tsx` (NOVO)

Hook que consulta diretamente o banco com a mesma lógica do badge:

```typescript
export function useSlaExceededItems() {
  return useQuery({
    queryKey: ["sla-exceeded-items", user?.id],
    queryFn: async (): Promise<InboxViewItem[]> => {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from("inbox_view")
        .select("*")
        .eq("status", "open")
        .eq("last_sender_type", "contact")
        .lt("last_message_at", fourHoursAgo)
        .order("last_message_at", { ascending: true })
        .limit(5000);
      
      if (error) throw error;
      return data as InboxViewItem[];
    },
    staleTime: 5000,
    refetchInterval: 60000,
    enabled: !!user?.id,
  });
}
```

### Etapa 3: Atualizar `useInboxView` - Filtro Dinâmico

**Arquivo:** `src/hooks/useInboxView.tsx`

Modificar a função `applyFilters` para calcular SLA dinamicamente:

```typescript
// DEPOIS (linhas 149-152): Cálculo dinâmico
if (filters.slaStatus) {
  const now = Date.now();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
  
  result = result.filter(item => {
    // SLA só aplica a mensagens de clientes em conversas abertas
    if (item.status === 'closed') return false;
    if (item.last_sender_type !== 'contact') return false;
    
    const lastMsg = new Date(item.last_message_at).getTime();
    const elapsed = now - lastMsg;
    
    if (filters.slaStatus === 'critical') {
      return elapsed >= FOUR_HOURS_MS;
    }
    if (filters.slaStatus === 'warning') {
      return elapsed >= ONE_HOUR_MS && elapsed < FOUR_HOURS_MS;
    }
    return true;
  });
}
```

### Etapa 4: Atualizar `Inbox.tsx` - Usar Hook Dedicado

**Arquivo:** `src/pages/Inbox.tsx`

Integrar `useSlaExceededItems` no filtro "sla":

```typescript
// Importar
import { useSlaExceededItems } from "@/hooks/useSlaExceededItems";

// Dentro do componente
const { data: slaExceededItems } = useSlaExceededItems();

// No filteredConversations useMemo (logo após filter === "mine")
if (filter === "sla") {
  if (!slaExceededItems || slaExceededItems.length === 0) {
    return [];
  }
  return slaExceededItems.map(item => {
    const fullConv = fullConversations.find(c => c.id === item.conversation_id);
    return fullConv || inboxItemToConversation(item);
  });
}
```

---

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/get-inbox-counts/index.ts` | Calcular slaCritical/slaWarning via SQL dinâmico |
| `src/hooks/useSlaExceededItems.tsx` | **CRIAR** - Hook dedicado para SLA excedido |
| `src/hooks/useInboxView.tsx` | Filtro slaStatus calculado dinamicamente |
| `src/pages/Inbox.tsx` | Usar novo hook no filtro "sla" |

---

## Fluxo Corrigido

```
┌─────────────────────────────────────────────────┐
│           BADGE (get-inbox-counts)              │
├─────────────────────────────────────────────────┤
│ SELECT count(*) FROM inbox_view                 │
│ WHERE status = 'open'                           │
│   AND last_sender_type = 'contact'              │
│   AND last_message_at < now() - interval '4h'   │
│                                                 │
│ Resultado: slaCritical = 67 ✅                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         LISTAGEM (useSlaExceededItems)          │
├─────────────────────────────────────────────────┤
│ SELECT * FROM inbox_view                        │
│ WHERE status = 'open'                           │
│   AND last_sender_type = 'contact'              │
│   AND last_message_at < now() - interval '4h'   │
│ ORDER BY last_message_at ASC                    │
│                                                 │
│ Resultado: 67 conversas ✅                      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│              CONSISTÊNCIA GARANTIDA             │
├─────────────────────────────────────────────────┤
│ Badge = 67                                      │
│ Lista = 67 itens                                │
│ ✅ MESMA QUERY = MESMA CONTAGEM                 │
└─────────────────────────────────────────────────┘
```

---

## Validação Pós-Implementação

1. Abrir Inbox
2. Verificar badge "SLA Excedido" mostra número > 0 (ex: 67)
3. Clicar em "SLA Excedido"
4. **Esperado**: Lista com exatamente N conversas (igual ao badge)
5. **Antes do fix**: Badge = 0, Lista = vazia

### Testes Adicionais
- Responder conversa com SLA crítico → sai da lista (imediatamente)
- Nova mensagem de cliente + esperar 4h → entra na lista (dinâmico)
- Badge e lista sempre iguais (consistência)
- Campo `sla_status` do banco NÃO é mais usado para filtros

---

## Conformidade com Regras do CRM

| Regra | Conformidade |
|-------|--------------|
| **Upgrade, não downgrade** | ✅ SLA agora é preciso em tempo real |
| **Zero regressão** | ✅ Outros filtros continuam funcionando |
| **Consistência** | ✅ Badge e lista usam mesma lógica SQL |
| **Read-only** | ✅ Apenas SELECT, nunca UPDATE |
| **Enterprise** | ✅ COUNT via SQL, não em JS |

---

## Observação sobre Campo Estático

O campo `inbox_view.sla_status` **continua existindo** por compatibilidade, mas **não será mais usado** para:
- Badge do Inbox
- Filtro "SLA Excedido"
- Qualquer funcionalidade crítica de tempo

A fonte de verdade passa a ser o cálculo dinâmico: `now() - last_message_at`.
