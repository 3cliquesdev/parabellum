
# Plano Enterprise FINAL: Cliente Opcional na Criação de Ticket (4 Ajustes Críticos)

## Resumo Executivo

Tornar `customer_id` opcional de ponta a ponta (DB → Hook → UI) com **4 garantias de produção** para evitar breaking changes e crashes.

### Escopo Crítico
1. **Migration simples** (sem risco de FK)
2. **Hook resiliente** (não enviar customer_id vazio)
3. **UI com reset de estado**
4. **CRÍTICO: Fallbacks em todas queries/componentes** (ticket.customer pode ser NULL)

---

## Análise de Impacto

### Pontos que **PODEM QUEBRAR** se customer_id virar NULL

| Camada | Arquivo | Risco | Status |
|--------|---------|-------|--------|
| **Queries** | `useTickets.tsx` (linhas 35-50) | Acessa `ticket.customer.*` sem check | ⚠️ CRÍTICO |
| **Details** | `useTicketById.tsx` (linha 14) | Faz `.select(customer:contacts(...))` | ⚠️ CRÍTICO |
| **UI - Listagem** | `TicketsList.tsx` (linhas 128-129) | `ticket.customer?.first_name` (já tem fallback ✅) | ✅ OK |
| **UI - Card** | `TicketCard.tsx` (linhas 131-133) | `ticket.contacts` (já tem fallback ✅) | ✅ OK |
| **UI - Detalhes** | `TicketDetails.tsx` (linha 382-387) | Usa `ticket.created_by_user` (OK) | ✅ OK |
| **UI - Info Card** | `CustomerInfoCard.tsx` | Renderiza dados do customer | ⚠️ CRÍTICO |
| **Search** | `useTickets.tsx` (linhas 266-268) | Acessa `ticket.customer.*` sem check | ⚠️ CRÍTICO |
| **Comments** | `useTicketComments.tsx` (linhas 55-57) | Usa `ticket.customer` sem check | ⚠️ CRÍTICO |

### Queries que Precisam de Ajuste
```
useTickets.tsx (linhas 35-50): SELECT *...customer:contacts(...)
→ Sem mudança necessária (query está OK) - só mudar UI que consome

useTicketById.tsx (linha 14): SELECT *...customer:contacts(...)
→ Sem mudança (query está OK) - renderização precisa de fallback
```

---

## Implementação Detalhada

### 1. Migration no Banco (Simples)

```sql
ALTER TABLE tickets 
ALTER COLUMN customer_id DROP NOT NULL;
```

**Por quê funciona:**
- FK constraint aceita NULL (PostgreSQL padrão)
- Nenhuma tabela depende de customer_id ser NOT NULL
- Impacto: ZERO em dados existentes

---

### 2. Atualizar Hook `useCreateTicket.tsx`

**Interface:**
```typescript
interface CreateTicketData {
  // ... campos existentes
  customer_id?: string; // MUDANÇA: agora opcional
  tag_ids?: string[];
}
```

**mutationFn:**
```typescript
// Linha ~48: Passar customer_id apenas se existir
const { data: ticket, error } = await supabase
  .from("tickets")
  .insert({
    ...ticketPayload,
    customer_id: ticketPayload.customer_id || undefined, // CRÍTICO: NULL ao invés de vazio
    created_by: user?.id,
  } as any)
  .select()
  .single();
```

---

### 3. Atualizar UI `CreateTicketDialog.tsx`

**A) Remover validação de customerId:**
```typescript
// LINHA 163 (antes):
if (!subject.trim() || !customerId) return;

// DEPOIS:
if (!subject.trim()) return;
```

**B) Atualizar canSubmit:**
```typescript
// LINHA 196 (antes):
const canSubmit = customerId && subject.trim() && !createTicket.isPending;

// DEPOIS:
const canSubmit = subject.trim() && !createTicket.isPending;
```

**C) Atualizar label (linha 214):**
```tsx
// ANTES:
<Label htmlFor="customer">Cliente *</Label>

// DEPOIS:
<Label htmlFor="customer">
  Cliente
  <span className="text-xs text-muted-foreground font-normal ml-1">(opcional)</span>
</Label>
```

**D) Passar `undefined` no submit (linha 170):**
```typescript
await createTicket.mutateAsync({
  // ... outros campos
  customer_id: customerId || undefined, // NOVO: undefined ao invés de vazio
  tag_ids: selectedTagIds,
});
```

**E) Resetar states ao fechar (adicionar no final de handleSubmit):**
```typescript
setCustomerId("");
setCustomerSearch("");
```

---

### 4. CRÍTICO: Fallbacks em Componentes/Hooks que Acessam `ticket.customer`

Este é o **ponto mais importante**. Se não fizermos, quando `customer_id = NULL`, a UI vai quebrar.

#### A) `src/hooks/useTicketComments.tsx` (Linhas 55-57)

**ANTES:**
```typescript
const customerName = ticket?.customer
  ? `${ticket.customer.first_name || ''} ${ticket.customer.last_name || ''}`.trim() || 'Cliente'
  : 'Cliente';
```

**DEPOIS:** (já tem fallback ✅)
```typescript
// Manter como está - já funciona com NULL
```

#### B) `src/components/TicketDetails.tsx` (Renderização)

**Componente CustomerInfoCard é chamado em linha ~540 aprox:**
```typescript
// ANTES (assumindo renderização incondicional):
{ticket.customer && <CustomerInfoCard customer={ticket.customer} />}

// DEPOIS (garantir condicional):
{ticket.customer ? (
  <CustomerInfoCard customer={ticket.customer} />
) : (
  <Card>
    <CardHeader>
      <CardTitle>Cliente</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">Sem cliente vinculado</p>
    </CardContent>
  </Card>
)}
```

#### C) `src/components/support/CreateTicketDialog.tsx` (Seleção de Cliente)

**Ao selecionar/pesquisar cliente (já previne NULL):**
```typescript
// Quando campo está vazio, isso já funciona:
customer_id || undefined  // ✅
```

#### D) `src/hooks/useTickets.tsx` (Busca - CRÍTICO)

**Linhas 266-268: Acesso a customer sem check**

**ANTES:**
```typescript
const customerFirstName = (ticket.customer?.first_name || '').toLowerCase();
const customerLastName = (ticket.customer?.last_name || '').toLowerCase();
const customerEmail = (ticket.customer?.email || '').toLowerCase();
```

**DEPOIS:** (já tem safe navigation ✅)
```typescript
// Manter como está - `?.` já previne erro se customer for NULL
// Se customer for NULL, a busca por nome/email simplesmente não matchará
```

#### E) `src/components/TicketsList.tsx` (Listagem)

**Linhas 128-129: Já tem fallback**
```typescript
{ticket.customer?.first_name || 'Cliente'} {ticket.customer?.last_name || ''}
```
✅ Já está seguro

#### F) `src/components/support/TicketCard.tsx` (Card na lista)

**Linhas 131-133: Já tem fallback**
```typescript
{ticket.contacts
  ? `${ticket.contacts.first_name} ${ticket.contacts.last_name}`
  : "Sem contato"}
```
✅ Já está seguro (usa `contacts` ao invés de `customer`, mas é a mesma coisa)

---

## Resumo: O que Precisa ser Feito

### Migration (1 comando SQL)
```sql
ALTER TABLE tickets ALTER COLUMN customer_id DROP NOT NULL;
```

### Código (3 arquivos)

| Arquivo | Mudanças | Crítico |
|---------|----------|---------|
| `src/hooks/useCreateTicket.tsx` | `customer_id?: string`, validação removida | ✅ Sim |
| `src/components/support/CreateTicketDialog.tsx` | Remover validação, atualizar label, reset states | ✅ Sim |
| `src/components/TicketDetails.tsx` | Fallback para CustomerInfoCard | ✅ Sim |

### Verificação (Não precisa mudança)
- `useTickets.tsx` → já usa `?.` (safe navigation) ✅
- `TicketsList.tsx` → já tem fallback ✅
- `TicketCard.tsx` → já tem fallback ✅
- `useTicketComments.tsx` → já tem fallback ✅

---

## Checklist de Garantias Críticas

| # | Garantia | Implementação |
|---|----------|---------------|
| 1 | Migration sem FK issues | `ALTER COLUMN ... DROP NOT NULL` |
| 2 | Hook não envia empty string | `customer_id: ticketPayload.customer_id \|\| undefined` |
| 3 | UI reseta estado | `setCustomerId("")` + `setCustomerSearch("")` após submit |
| 4 | Todas queries/componentes lidam com NULL | Fallbacks `?.` + condicionais em TicketDetails |

---

## Testes Manuais Obrigatórios

| # | Teste | Esperado |
|---|-------|----------|
| 1 | Criar ticket SEM cliente | Funciona - `customer_id = NULL` |
| 2 | Criar ticket COM cliente | Funciona - `customer_id = uuid` |
| 3 | Listar tickets sem cliente | Exibe "Cliente" ao invés de null |
| 4 | Ver detalhes de ticket sem cliente | Exibe "Sem cliente vinculado" em CustomerInfoCard |
| 5 | Buscar por nome/email em ticket sem cliente | Busca funciona, não matcheia (normal) |
| 6 | Abrir/fechar modal criar | Estados limpos (selectedTagIds, customerId, customerSearch) |
| 7 | Público criar ticket sem cliente | Funciona (si aplica) |
| 8 | Comentar em ticket sem cliente | Exibe "Cliente" no metadata |

---

## Nota Técnica Final

O **ponto crítico** é que `ticket.customer` **NÃO pode ser obrigatório em nenhum lugar**. A maioria dos componentes já está protegida com `?.` ou fallback, mas TicketDetails pode quebrar se tentar renderizar CustomerInfoCard sem check.

