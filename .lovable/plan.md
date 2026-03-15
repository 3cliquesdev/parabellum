

# Corrigir busca infinita do pedido

## Problema
O campo de rastreio no `AdminReturnDialog` dispara o `onBlur` que chama `handleTrackingBlur`. Se outros hooks da aplicação (como o polling de `availability_status`) causarem re-renders no componente, o input pode perder e recuperar foco repetidamente, disparando múltiplas chamadas de lookup. O mesmo problema pode ocorrer no `NewReturnDialog` do cliente.

## Solução

### 1. `AdminReturnDialog.tsx`
- Adicionar uma flag `searchedTrackingRef` (useRef) para guardar o último tracking já buscado
- No `handleTrackingBlur`, verificar se `trimmed === searchedTrackingRef.current` e pular a busca se já foi feita
- Resetar a ref quando o valor do input mudar (no onChange)

### 2. `NewReturnDialog.tsx`
- Mesma lógica: usar um `useRef` para guardar o último tracking buscado
- No `lookupOrderByTracking`, pular se já buscou esse mesmo valor
- Resetar quando o input mudar

### Detalhe técnico
```typescript
const lastSearchedRef = useRef<string>("");

const handleTrackingBlur = async () => {
  const trimmed = trackingOriginal.trim();
  if (!trimmed || trimmed === lastSearchedRef.current) return; // Evita busca duplicada
  lastSearchedRef.current = trimmed;
  // ... resto da lógica
};

// No onChange, resetar:
onChange={(e) => {
  setTrackingOriginal(e.target.value);
  lastSearchedRef.current = ""; // Permite nova busca se valor mudar
  // ...
}}
```

Arquivos a modificar:
- `src/components/support/AdminReturnDialog.tsx`
- `src/components/client-portal/NewReturnDialog.tsx`

