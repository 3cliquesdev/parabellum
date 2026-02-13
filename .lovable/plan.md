
# FIX ENTERPRISE: Polling Condicional + Health Check Reativo

## Problema Confirmado

### 1. `useRealtimeHealth.tsx` (linha 121) - Health check não re-renderiza
```typescript
// PROBLEMA: setLastEventReceived(prev => prev) não causa re-render
healthCheckInterval = setInterval(() => {
  setLastEventReceived(prev => prev);
}, 10000);
```

O `useMemo` de `isDegraded` depende de `lastEventReceived`, mas como o valor não muda, React não recalcula. Resultado: agentes com degradação silenciosa nunca recebem a mudança de `isDegraded = true` e portanto nunca ativam o polling.

### 2. `useMessages.tsx` (linha 56 + 82-115) - Polling não existe
```typescript
const { isHealthy, isDegraded, registerEvent } = useRealtimeHealth(); // importado mas não usado

const query = useQuery({
  // ... sem refetchInterval condicional
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
});
```

Mesmo que `isDegraded` fosse reativo, a query não teria polling ativo.

---

## Solução: 2 Mudanças Cirúrgicas

### PATCH 1: `src/hooks/useRealtimeHealth.tsx`

**Objetivo**: Forçar re-render periódico do health state para que `isDegraded` seja recalculado.

**Implementação**:
1. Adicionar estado `healthTick` (inicializa em 0)
2. No interval de 10s, incrementar `healthTick` em vez de chamar `setLastEventReceived(prev => prev)`
3. Adicionar `healthTick` como dependência dos `useMemo` de `isHealthy` e `isDegraded`

**Detalhes técnicos**:
- `healthTick` é apenas um "contador de pulsos" que força recalcuação
- O cálculo real continua usando `lastEventReceived` (timestamp do último evento)
- Cada 10s, o tick incrementa → `useMemo` re-executa → `isDegraded` é avaliado em tempo real

**Mudanças exatas**:
- Linha 16: Adicionar `const [healthTick, setHealthTick] = useState(0);`
- Linhas 23-34: Adicionar `healthTick` às dependências de ambos os `useMemo`
- Linha 121-122: Substituir `setLastEventReceived(prev => prev)` por `setHealthTick(t => t + 1)`

### PATCH 2: `src/hooks/useMessages.tsx`

**Objetivo**: Ativar polling de 5s apenas quando `isDegraded === true`.

**Implementação**:
1. Usar `isDegraded` na query do React Query (já é importado, linha 56)
2. Adicionar `refetchInterval: isDegraded ? 5000 : false` na config da query

**Detalhes técnicos**:
- Quando saudável (`isDegraded = false`): polling = OFF (comportamento idêntico ao atual)
- Quando degradado (`isDegraded = true`): polling = ON a cada 5s
- Quando recupera: `isDegraded` volta a false, polling desliga automaticamente
- `refetchIntervalInBackground: false` mantém polling desligado se aba está em background

**Mudanças exatas**:
- Linhas 82-115: Adicionar linha após `refetchOnReconnect: false`:
  ```typescript
  refetchInterval: isDegraded ? 5000 : false,
  ```
- Linha 405: Reforçar que `runCatchUp()` é chamado em CHANNEL_ERROR/CLOSED (já existe, mas validar)

---

## Fluxo de Funcionamento (End-to-End)

```text
CENÁRIO 1: Realtime saudável
├─ registerEvent() chamado ao receber msg
├─ lastEventReceived = agora
├─ healthTick dispara a cada 10s
├─ isDegraded muda para false
└─ polling: OFF (0 requisições extras)

CENÁRIO 2: Realtime para entregar eventos (mas não fecha canal)
├─ Nenhum registerEvent() por 60+ segundos
├─ healthTick dispara a cada 10s
├─ isDegraded muda para true REATIVAMENTE
├─ Polling: ON (refetch a cada 5s)
└─ mensagens novas chegam em até ~5s

CENÁRIO 3: Recuperação
├─ Evento chega novamente
├─ registerEvent() é chamado
├─ lastEventReceived = agora
├─ healthTick dispara
├─ isDegraded muda para false
└─ Polling: OFF (automaticamente)
```

---

## Impacto e Zero Regressão

| Aspecto | Antes | Depois | Impacto |
|---------|-------|--------|---------|
| Realtime saudável | Ok (sem polling) | Ok (sem polling) | ✅ Zero mudança |
| Degradação silenciosa | Mensagens não chegam | Polling 5s ativa | ✅ Fix do problema |
| Dedupe de mensagens | Via client_message_id | Via client_message_id | ✅ Mantido |
| Merge otimista | Funciona | Funciona | ✅ Mantido |
| Catch-up (30s) | Existe | Existe + imediato | ✅ Melhorado |
| Taxa de requisições (agente saudável) | Sem polling | Sem polling | ✅ Zero impacto |
| Taxa de requisições (agente degradado) | N/A | +1 req/5s | ✅ Aceitável (fallback) |

---

## Critérios de Aceitação Verificáveis

1. **Em conexão saudável**: Network tab não mostra polling extra, comportamento idêntico
2. **Simulando degradação** (ex.: DevTools throttle, desligar internet por 70s):
   - `isDegraded` vira true automaticamente após ~60s
   - Polling começa dentro de 10s (próximo healthTick)
   - Mensagens novas aparecem dentro de ~5s
3. **Recuperação**: Quando internet volta, `isDegraded` vira false dentro de 10s, polling desliga
4. **Sem regressão**: Dedupe, merge, scroll-up carregando mensagens antigas, todas funcionam igual

---

## Arquivos a Modificar

1. **`src/hooks/useRealtimeHealth.tsx`**
   - Linha 16: Adicionar `const [healthTick, setHealthTick] = useState(0);`
   - Linhas 23-34: Adicionar `healthTick` nas dependências dos memos
   - Linha 121: Substituir `setLastEventReceived(prev => prev)` por `setHealthTick(t => t + 1)`

2. **`src/hooks/useMessages.tsx`**
   - Após linha 114: Adicionar `refetchInterval: isDegraded ? 5000 : false,`
   - (Já existe catch-up em CHANNEL_ERROR/CLOSED, apenas validar)

**Complexidade**: Mínima (3 linhas de código + 1 adição)
**Risco**: Nenhum (comportamento saudável não muda, fallback defensivo apenas quando necessário)

