

## Plano: Corrigir Loop Destrutivo do Realtime Health

### Diagnostico do Problema

Analisei os logs e o codigo. O problema e **critico e auto-causado**:

| Componente | Status | Problema |
|------------|--------|----------|
| `useRealtimeHealth.tsx` | QUEBRADO | Loop destrutivo que remove todos os canais a cada 30s |
| Canais de mensagens | DESTRUIDOS | Sao removidos junto com o canal de health |
| Cliente Supabase | SEM OPCOES | Nao tem configuracoes de realtime (heartbeat, timeout) |

**Causa Raiz**: O `useRealtimeHealth` verifica a cada 30 segundos se o canal de health esta "joined", mas:

1. A verificacao usa `c.topic === 'realtime:realtime-health-check'` - mas o Supabase pode usar outro formato
2. Quando detecta que nao esta "joined" (sempre falso), chama `forceReconnect()`
3. `forceReconnect()` **REMOVE TODOS OS CANAIS** do Supabase, incluindo os canais de mensagens e inbox
4. Isso mata as subscricoes de realtime que estavam funcionando
5. Os hooks de `useMessages` e `useInboxView` precisam recriar seus canais
6. 30 segundos depois, o ciclo repete

**Logs comprovando o problema:**
```text
[RealtimeHealth] Health channel not joined, status: undefined
[RealtimeHealth] Forcing reconnection of all channels...
RealtimeNotifications consolidated subscription status: CLOSED  // <-- Canal destruido!
[RealtimeHealth] All channels removed, queries invalidated
```

---

### Fluxo Atual (Quebrado)

```text
useRealtimeHealth cria canal de health check
         |
         v
[30 segundos]
         |
         v
Ping verifica: channel.topic === 'realtime:realtime-health-check'
         |
         v
Supabase usa outro formato de topic -> FALSE
         |
         v
forceReconnect() chamado
         |
         v
REMOVE TODOS OS CANAIS (incluindo messages, inbox_view)
         |
         v
Canais de mensagens MORTOS
         |
         v
Mensagens nao chegam em tempo real
         |
         v
[30 segundos] -> Repete o ciclo
```

---

### Solucao Proposta

#### 1. Reescrever useRealtimeHealth.tsx

O hook precisa ser completamente refeito para:

1. NAO destruir todos os canais - apenas monitorar
2. Usar metodo correto para verificar status do canal
3. Recriar apenas o canal de health se necessario (nao todos)
4. Invalidar queries sem destruir canais existentes

**Arquivo**: `src/hooks/useRealtimeHealth.tsx`

```typescript
// ANTES (QUEBRADO):
const forceReconnect = useCallback(async () => {
  // PROBLEMA: Remove TODOS os canais!
  const channels = supabase.getChannels();
  for (const channel of channels) {
    await supabase.removeChannel(channel);
  }
  // ...
});

// DEPOIS (CORRIGIDO):
const forceReconnect = useCallback(async () => {
  // Apenas invalida queries - NAO remove canais!
  // Os hooks individuais gerenciam seus proprios canais
  queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
  queryClient.invalidateQueries({ queryKey: ['messages'] });
  queryClient.invalidateQueries({ queryKey: ['conversations'] });
});
```

---

#### 2. Melhorar Verificacao de Status

Usar o metodo correto para verificar se canais estao ativos:

```typescript
// ANTES (QUEBRADO):
const healthCh = channels.find(c => c.topic === 'realtime:realtime-health-check');
if (!healthCh || healthCh.state !== 'joined') {
  // Sempre falso porque topic tem formato diferente
}

// DEPOIS (CORRIGIDO):
// Usar o metodo oficial do Supabase
const channels = supabase.getChannels();
const anySubscribed = channels.some(c => c.state === 'joined');
if (!anySubscribed && channels.length > 0) {
  // Problema real de conexao
}
```

---

#### 3. Adicionar Configuracoes de Realtime ao Cliente

Criar um wrapper para o cliente Supabase com configuracoes de realtime, ja que nao podemos editar o arquivo auto-gerado.

**Arquivo novo**: `src/lib/supabaseRealtime.ts`

```typescript
import { supabase } from "@/integrations/supabase/client";

// Configurar opções de realtime diretamente no cliente
supabase.realtime.setAuth(localStorage.getItem('sb-access-token') || '');

// Heartbeat e reconexão são gerenciados pelo SDK automaticamente
// Apenas precisamos garantir que não destruímos os canais
```

---

### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/hooks/useRealtimeHealth.tsx` | Reescrever | Corrigir loop destrutivo, parar de remover canais |
| `src/components/Layout.tsx` | Manter | Ja usa o hook corretamente |
| `src/hooks/useMessages.tsx` | Verificar | Garantir que canal nao e afetado |
| `src/hooks/useInboxView.tsx` | Verificar | Garantir que canal nao e afetado |

---

### Secao Tecnica: Hook Corrigido

```typescript
// src/hooks/useRealtimeHealth.tsx - VERSAO CORRIGIDA
import { useEffect, useState, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeHealth() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const reconnectAttempts = useRef(0);
  const lastVisibilityChange = useRef<number>(Date.now());
  const healthChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Forçar refetch de dados - SEM destruir canais!
  const forceReconnect = useCallback(async () => {
    console.log('[RealtimeHealth] Forcing data refresh (NOT removing channels)...');
    
    // Apenas invalidar queries para refetch
    // NAO remover canais - cada hook gerencia o seu
    queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
    queryClient.invalidateQueries({ queryKey: ['messages'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    
    reconnectAttempts.current = 0;
  }, [queryClient]);

  // Monitorar conexão com canal próprio de health check
  useEffect(() => {
    let pingInterval: NodeJS.Timeout;

    const setupHealthCheck = () => {
      // Remover canal anterior se existir
      if (healthChannelRef.current) {
        supabase.removeChannel(healthChannelRef.current);
      }

      const channel = supabase
        .channel('realtime-health-check')
        .on('presence', { event: 'sync' }, () => {
          setIsConnected(true);
          setLastPing(new Date());
        })
        .subscribe((status, err) => {
          console.log('[RealtimeHealth] Health channel status:', status, err);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setLastPing(new Date());
            reconnectAttempts.current = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setIsConnected(false);
          }
        });

      healthChannelRef.current = channel;
    };

    setupHealthCheck();

    // Ping periódico - verifica APENAS o status geral, sem destruir canais
    pingInterval = setInterval(() => {
      const channels = supabase.getChannels();
      const joinedChannels = channels.filter(c => c.state === 'joined');
      
      if (joinedChannels.length === 0 && channels.length > 0) {
        console.log('[RealtimeHealth] No joined channels, may have connectivity issue');
        setIsConnected(false);
        
        // Apenas recriar o canal de health - NAO todos os canais
        if (reconnectAttempts.current < 5) {
          reconnectAttempts.current++;
          setupHealthCheck();
        }
      } else {
        setIsConnected(true);
        setLastPing(new Date());
      }
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      if (healthChannelRef.current) {
        supabase.removeChannel(healthChannelRef.current);
        healthChannelRef.current = null;
      }
    };
  }, []); // Sem dependências - roda apenas uma vez

  // Reconectar quando tab volta ao foco
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastChange = Date.now() - lastVisibilityChange.current;
        
        // Se ficou mais de 2 minutos em background, forçar refresh de dados
        if (timeSinceLastChange > 120000) {
          console.log('[RealtimeHealth] Tab visible after long background, refreshing data');
          await forceReconnect();
        }
      }
      
      lastVisibilityChange.current = Date.now();
    };

    const handleOnline = () => {
      console.log('[RealtimeHealth] Browser came online, refreshing data');
      forceReconnect();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleOnline);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
    };
  }, [forceReconnect]);

  return { isConnected, lastPing, forceReconnect };
}
```

---

### Resultado Esperado

| Metrica | Antes | Depois |
|---------|-------|--------|
| Canais de mensagens | Destruidos a cada 30s | Permanecem ativos |
| Mensagens em tempo real | NAO funcionam | Funcionam |
| Loop destrutivo | SIM | NAO |
| Refetch de dados | Funciona | Funciona |
| Reconexao apos background | Destruia canais | Apenas invalida queries |

---

### Teste de Validacao

Apos implementar, os logs devem mostrar:

```text
// ANTES (QUEBRADO):
[RealtimeHealth] Health channel not joined, status: undefined
[RealtimeHealth] Forcing reconnection of all channels...
[RealtimeHealth] All channels removed  // <-- PROBLEMA!

// DEPOIS (CORRIGIDO):
[RealtimeHealth] Health channel status: SUBSCRIBED
[Realtime] Message INSERT - updating snippet instantly: xxx
[Realtime] inbox_view change: UPDATE
```

Os canais de `useMessages` e `useInboxView` continuarao ativos e recebendo eventos em tempo real.

