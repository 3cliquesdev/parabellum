
# Plano: Corrigir Busca MySQL por Tracking e Order ID

## Problema Identificado

A query atual busca **apenas em `box_number`**, mas a estrutura real do MySQL é:

| Coluna | Conteúdo | Exemplo |
|--------|----------|---------|
| `tracking_number` | Código de rastreio Correios | `BR258217438746K` |
| `platform_order_id` | ID completo do pedido | `SABR-N-SHPE-6965-16193159` |
| `status` | Status do pacote | `PACKED` |
| `updated_at` | Data/hora de envio | `2026-01-27 15:51:14` |

O cliente envia apenas o **número final** (ex: `16193159`), mas no banco está como `SABR-N-SHPE-6965-16193159`.

---

## Solução

### Modificar `fetch-tracking` para Query Dual

**Arquivo: `supabase/functions/fetch-tracking/index.ts`**

Lógica de busca:
1. **Códigos BR.../LP.../LB...** → Buscar em `tracking_number`
2. **Números puros** → Buscar em `platform_order_id` com `LIKE '%-{numero}'` (final do ID)

```typescript
// Separar códigos por tipo
const trackingCodes = codes.filter(c => detectSearchType(c) === 'tracking');
const orderIds = codes.filter(c => detectSearchType(c) === 'order_id');

let allResults: any[] = [];

// Buscar por código de rastreio (BR..., LP..., LB...)
if (trackingCodes.length > 0) {
  const placeholders = trackingCodes.map(() => '?').join(', ');
  const query = `
    SELECT platform_order_id, tracking_number, status, updated_at 
    FROM parcel 
    WHERE tracking_number IN (${placeholders})
  `;
  const results = await client.query(query, trackingCodes);
  allResults = allResults.concat(results);
}

// Buscar por número do pedido (numérico - final do platform_order_id)
if (orderIds.length > 0) {
  // Para cada ID, criar condição LIKE '%-{numero}'
  const likeConditions = orderIds.map(() => 'platform_order_id LIKE ?').join(' OR ');
  const likeParams = orderIds.map(id => `%-${id}`);
  
  const query = `
    SELECT platform_order_id, tracking_number, status, updated_at 
    FROM parcel 
    WHERE ${likeConditions}
  `;
  const results = await client.query(query, likeParams);
  allResults = allResults.concat(results);
}
```

### Interface de Resultado Atualizada

```typescript
interface TrackingResult {
  platform_order_id: string;        // ID completo do pedido
  tracking_number: string | null;   // Código de rastreio
  status: string | null;            // PACKED, SHIPPED, etc.
  updated_at: Date | null;          // Data/hora de envio
  updated_at_formatted: string | null; // Formatado para exibição
  is_packed: boolean;
}
```

### Mapeamento de Resposta

Para manter compatibilidade com o código existente, mapear resultados para o código original solicitado:

```typescript
// Mapear resultados - tanto pelo tracking quanto pelo order_id parcial
for (const row of allResults) {
  const trackingNum = row.tracking_number as string | null;
  const platformOrderId = row.platform_order_id as string | null;
  const updatedAt = row.updated_at as Date | null;
  
  // Identificar qual código original encontrou este resultado
  const originalCode = codes.find(c => {
    if (trackingNum && c.toUpperCase() === trackingNum.toUpperCase()) return true;
    if (platformOrderId && platformOrderId.endsWith(`-${c}`)) return true;
    return false;
  });
  
  if (originalCode) {
    trackingData[originalCode] = {
      platform_order_id: platformOrderId,
      tracking_number: trackingNum,
      status: row.status,
      updated_at: updatedAt,
      updated_at_formatted: formatDate(updatedAt),
      is_packed: row.status === 'PACKED' || !!updatedAt,
    };
  }
}
```

---

## Fluxo Após Correção

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FLUXO CORRIGIDO - BUSCA DUAL                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  Cliente: "16193159"                                                          │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 1. detectSearchType("16193159")             │                             │
│  │    → Retorna 'order_id' (não começa BR/LP)  │                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 2. Query MySQL:                             │                             │
│  │    SELECT * FROM parcel                     │                             │
│  │    WHERE platform_order_id LIKE '%-16193159'│                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 3. Resultado encontrado:                    │                             │
│  │    platform_order_id: SABR-N-SHPE-6965-...  │                             │
│  │    tracking_number: BR258217438746K         │                             │
│  │    status: PACKED                           │                             │
│  │    updated_at: 2026-01-27 15:51:14          │                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 4. IA responde:                             │                             │
│  │    "Seu pedido 16193159 foi embalado em     │                             │
│  │     27/01/2026 às 15:51. Código de rastreio:│                             │
│  │     BR258217438746K. Status: PACKED"        │                             │
│  └─────────────────────────────────────────────┘                             │
│                                                                               │
│  ──────────────────────────────────────────────                              │
│                                                                               │
│  Cliente: "BR258217438746K"                                                   │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 1. detectSearchType("BR258217438746K")      │                             │
│  │    → Retorna 'tracking' (começa com BR)     │                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 2. Query MySQL:                             │                             │
│  │    SELECT * FROM parcel                     │                             │
│  │    WHERE tracking_number = 'BR258217438746K'│                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ▼                                                                     │
│  ✅ Mesmo resultado encontrado!                                               │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/fetch-tracking/index.ts` | Reescrever query para busca dual (tracking_number + platform_order_id LIKE) |

---

## Resultado Esperado

| Input do Cliente | Query Gerada | Resultado |
|------------------|--------------|-----------|
| `16193159` | `WHERE platform_order_id LIKE '%-16193159'` | ✅ Encontra SABR-N-SHPE-6965-16193159 |
| `BR258217438746K` | `WHERE tracking_number = 'BR258217438746K'` | ✅ Encontra o registro |
| `16315521` | `WHERE platform_order_id LIKE '%-16315521'` | ✅ Encontra (se existir) |

---

## Nota sobre UI

O PersonaDialog já está configurado corretamente com os 5 toggles de acesso a dados:
- 👤 Dados do Cliente
- 📚 Base de Conhecimento  
- 📦 Histórico de Pedidos
- 💰 Dados Financeiros
- 🚚 Rastreio de Pedidos (MySQL)

Eles já estão visíveis na mesma tela de configuração de temperature/tokens. Não é necessário modificar a UI.
