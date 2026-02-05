

# Plano: Corrigir Sistema de Filtros do Time Comercial

## Diagnóstico

### Problema Principal
O usuário aplicou filtro "Previsão de Fechamento: 01/01/2026 - 31/01/2026" e o pipeline mostra **0 negócios**. Isso ocorre porque:

- **ZERO deals** na base de dados têm a coluna `expected_close_date` preenchida
- O banco possui **18.376 deals totais**, mas todos têm `expected_close_date = NULL`
- Portanto, qualquer filtro nessa coluna retorna 0 resultados

### Problemas Secundários Identificados

| Problema | Impacto |
|----------|---------|
| Função `clearAllFilters()` incompleta | Não limpa campos de data, status, etapas, probabilidade |
| Função `generateDealFilterChips()` incompleta | Não exibe chips para `updatedDateRange`, `status`, `stageIds`, `probability` |
| Label confuso "Fechamento" | Usuários podem confundir com data real de fechamento (`closed_at`) |

---

## Solução

### 1. Corrigir `clearAllFilters()` em `Deals.tsx`

**Arquivo:** `src/pages/Deals.tsx` (linha 159-161)

**Antes:**
```typescript
const clearAllFilters = () => {
  setDealFilters({ search: "", leadSource: [], assignedTo: [] });
};
```

**Depois:**
```typescript
const clearAllFilters = () => {
  setDealFilters({
    search: "",
    leadSource: [],
    assignedTo: [],
    status: [],
    stageIds: [],
    sortBy: "created_at_desc",
    createdDateRange: undefined,
    expectedCloseDateRange: undefined,
    updatedDateRange: undefined,
    valueMin: undefined,
    valueMax: undefined,
    probabilityMin: undefined,
    probabilityMax: undefined,
  });
};
```

### 2. Completar `generateDealFilterChips()` em `active-filter-chips.tsx`

**Arquivo:** `src/components/ui/active-filter-chips.tsx`

Adicionar chips faltantes para:
- `updatedDateRange` (Última Atualização)
- `status` (Status: Aberto/Ganho/Perdido)
- `stageIds` (Etapas do Pipeline)
- `probabilityMin/Max` (Probabilidade)

**Código a adicionar após linha 91:**
```typescript
// Última atualização
if (filters.updatedDateRange?.from) {
  const label = filters.updatedDateRange.to 
    ? `Atualizado: ${formatDate(filters.updatedDateRange.from)} - ${formatDate(filters.updatedDateRange.to)}`
    : `Atualizado desde: ${formatDate(filters.updatedDateRange.from)}`;
  chips.push({ key: "updatedDateRange", label });
}

// Status
if (filters.status && filters.status.length > 0) {
  const statusLabels: Record<string, string> = {
    open: "Aberto",
    won: "Ganho",
    lost: "Perdido"
  };
  const labels = filters.status.map(s => statusLabels[s] || s).join(", ");
  chips.push({ key: "status", label: `Status: ${labels}` });
}

// Probabilidade
if (filters.probabilityMin !== undefined || filters.probabilityMax !== undefined) {
  const min = filters.probabilityMin ?? 0;
  const max = filters.probabilityMax ?? 100;
  chips.push({ key: "probability", label: `Probabilidade: ${min}% - ${max}%` });
}

// Etapas (se implementado)
if (filters.stageIds && filters.stageIds.length > 0) {
  chips.push({ key: "stageIds", label: `${filters.stageIds.length} etapa(s) selecionada(s)` });
}
```

### 3. Atualizar interface do `generateDealFilterChips`

A interface de entrada precisa ser expandida para incluir os novos campos.

### 4. Corrigir `handleRemoveFilterChip` para arrays

**Arquivo:** `src/pages/Deals.tsx`

Adicionar tratamento para campos de array como `status` e `stageIds`:

```typescript
} else if (key === "status") {
  setDealFilters({ ...dealFilters, status: [] });
} else if (key === "stageIds") {
  setDealFilters({ ...dealFilters, stageIds: [] });
} else if (key === "probability") {
  setDealFilters({ ...dealFilters, probabilityMin: undefined, probabilityMax: undefined });
} else {
  setDealFilters({ ...dealFilters, [key]: undefined });
}
```

### 5. (Opcional) Melhorar label do chip de "Fechamento"

Mudar de "Fechamento" para "Prev. Fechamento" para evitar confusão com `closed_at`:

```typescript
// Em generateDealFilterChips
if (filters.expectedCloseDateRange?.from) {
  const label = filters.expectedCloseDateRange.to 
    ? `Prev. Fechamento: ${formatDate(filters.expectedCloseDateRange.from)} - ${formatDate(filters.expectedCloseDateRange.to)}`
    : `Prev. Fechamento desde: ${formatDate(filters.expectedCloseDateRange.from)}`;
  chips.push({ key: "expectedCloseDateRange", label });
}
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Deals.tsx` | `clearAllFilters()` completo + `handleRemoveFilterChip()` para arrays |
| `src/components/ui/active-filter-chips.tsx` | `generateDealFilterChips()` com todos os chips + interface expandida |

---

## Seção Técnica

### Por que `expected_close_date` está vazio?

- A coluna existe e é do tipo `DATE` (nullable)
- **Nenhum deal** teve previsão de fechamento cadastrada
- Isso é um problema de dados, não de código
- Sugestão: preencher automaticamente com `created_at + 30 dias` para deals novos

### Impacto

| Antes | Depois |
|-------|--------|
| Limpar filtros não limpa datas | Todos os filtros são limpos corretamente |
| Chips não mostram todos os filtros ativos | Todos os filtros têm visualização |
| Filtro "Fechamento" confuso | Label "Prev. Fechamento" mais claro |
| Ao remover chip de status/etapas, comportamento incorreto | Arrays são limpos corretamente |

### Validação Pós-Deploy

1. Abrir página de Deals
2. Aplicar filtro "Previsão de Fechamento" → verificar que chip aparece
3. Aplicar filtro "Data de Criação: Janeiro 2026" → verificar que deals aparecem
4. Clicar em "Limpar Tudo" → verificar que TODOS os filtros são removidos
5. Clicar no X de cada chip → verificar que remove corretamente
6. Aplicar filtro de Status (Aberto/Ganho/Perdido) → verificar que chip aparece

