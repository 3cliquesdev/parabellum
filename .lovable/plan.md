

## Plano de Correcao: Filtros de Tickets Desaparecendo ao Navegar

### Problema Identificado

Quando o atendente aplica filtros na lista de tickets e depois:
1. Clica em um ticket para ver detalhes
2. Clica em "Voltar"

Os filtros desaparecem porque a navegacao nao preserva os parametros da URL.

### Causa Raiz

**Navegacao sem preservar query params:**

1. **Ao abrir ticket** (`Support.tsx:291`):
```typescript
navigate(`/support/${ticketId}`); // NAO preserva ?filter=xxx&filters={}
```

2. **Ao voltar do ticket** (`TicketDetail.tsx:55`):
```typescript
navigate('/support'); // NAO preserva filtros
```

3. **Ao pressionar Enter** (`Support.tsx:254`):
```typescript
navigate(`/support/${selectedTicketId}`); // Mesmo problema
```

### Solucao Proposta

Preservar os filtros em `sessionStorage` ou `localStorage` para restaurar ao voltar.

**Abordagem:** Usar `sessionStorage` para manter os filtros durante a sessao do navegador.

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Support.tsx` | Salvar filtros no sessionStorage antes de navegar |
| `src/pages/Support.tsx` | Restaurar filtros do sessionStorage ao montar |
| `src/pages/TicketDetail.tsx` | Navegar de volta preservando os filtros |

---

### Implementacao Detalhada

#### 1. Support.tsx - Salvar filtros antes de navegar

```typescript
// Nova constante para chave do storage
const TICKET_FILTERS_STORAGE_KEY = 'ticket-filters-session';

// Funcao para salvar filtros no sessionStorage
const saveFiltersToSession = useCallback(() => {
  const filtersState = {
    sidebarFilter,
    advancedFilters,
    searchTerm,
    currentPage,
  };
  sessionStorage.setItem(TICKET_FILTERS_STORAGE_KEY, JSON.stringify(filtersState));
}, [sidebarFilter, advancedFilters, searchTerm, currentPage]);

// Modificar handleSelectTicket para salvar antes de navegar
const handleSelectTicket = (ticketId: string) => {
  if (isMobile) {
    setSelectedTicketId(ticketId);
    setMobileView('details');
  } else {
    // Salvar filtros ANTES de navegar
    saveFiltersToSession();
    navigate(`/support/${ticketId}`);
  }
};

// Modificar navegacao por Enter (linha 254)
if (e.key === 'Enter' && selectedTicketId) {
  e.preventDefault();
  if (isMobile) {
    setMobileView('details');
  } else {
    saveFiltersToSession(); // ADICIONAR
    navigate(`/support/${selectedTicketId}`);
  }
}
```

#### 2. Support.tsx - Restaurar filtros ao montar

```typescript
// Modificar inicializacao do estado para ler do sessionStorage
const [restoredFromSession, setRestoredFromSession] = useState(false);

// useEffect para restaurar filtros do sessionStorage
useEffect(() => {
  if (restoredFromSession) return;
  
  const savedFilters = sessionStorage.getItem(TICKET_FILTERS_STORAGE_KEY);
  if (savedFilters) {
    try {
      const parsed = JSON.parse(savedFilters);
      
      // Restaurar apenas se nao tiver parametros na URL
      if (!searchParams.get('filter') && !searchParams.get('filters')) {
        setSidebarFilter(parsed.sidebarFilter || 'all');
        setAdvancedFilters(parsed.advancedFilters || defaultTicketFilters);
        setSearchTerm(parsed.searchTerm || '');
        setCurrentPage(parsed.currentPage || 1);
      }
      
      // Limpar sessionStorage apos restaurar
      sessionStorage.removeItem(TICKET_FILTERS_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to restore filters:', e);
    }
  }
  setRestoredFromSession(true);
}, [restoredFromSession]);
```

#### 3. TicketDetail.tsx - Voltar para /support (sem mudancas)

O botao "Voltar" pode continuar navegando para `/support` normalmente, pois os filtros serao restaurados do sessionStorage.

```typescript
// Manter como esta, pois sessionStorage cuidara da restauracao
<Button variant="ghost" size="sm" onClick={() => navigate('/support')}>
```

---

### Beneficios da Correcao

- Filtros persistem durante navegacao entre lista e detalhes
- Nao polui URL do ticket com parametros de filtro
- Funciona com navegacao por teclado (Enter)
- Limpa automaticamente ao fechar aba/navegador (sessionStorage)
- Preserva pagina atual, termo de busca e todos os filtros

---

### Secao Tecnica

**Fluxo de dados:**

```text
[Lista de Tickets]
       |
       | (click em ticket)
       v
  saveFiltersToSession()
       |
       v
  navigate('/support/:id')
       |
       | (click em Voltar)
       v
  navigate('/support')
       |
       v
  useEffect restaura do sessionStorage
       |
       v
[Lista com filtros preservados]
```

**Codigo principal:**

```typescript
// src/pages/Support.tsx

const TICKET_FILTERS_STORAGE_KEY = 'ticket-filters-session';

const saveFiltersToSession = useCallback(() => {
  const filtersState = {
    sidebarFilter,
    advancedFilters,
    searchTerm,
    currentPage,
  };
  sessionStorage.setItem(TICKET_FILTERS_STORAGE_KEY, JSON.stringify(filtersState));
}, [sidebarFilter, advancedFilters, searchTerm, currentPage]);

// Restaurar ao montar
useEffect(() => {
  const saved = sessionStorage.getItem(TICKET_FILTERS_STORAGE_KEY);
  if (saved && !searchParams.get('filter')) {
    const parsed = JSON.parse(saved);
    setSidebarFilter(parsed.sidebarFilter || 'all');
    setAdvancedFilters(parsed.advancedFilters || defaultTicketFilters);
    setSearchTerm(parsed.searchTerm || '');
    setCurrentPage(parsed.currentPage || 1);
    sessionStorage.removeItem(TICKET_FILTERS_STORAGE_KEY);
  }
}, []);

// Salvar antes de navegar
const handleSelectTicket = (ticketId: string) => {
  if (isMobile) {
    setSelectedTicketId(ticketId);
    setMobileView('details');
  } else {
    saveFiltersToSession();
    navigate(`/support/${ticketId}`);
  }
};
```

