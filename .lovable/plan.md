
## Plano: Corrigir Realtime que Para de Funcionar em Producao

### Diagnostico do Problema

Apos analise completa do codigo e infraestrutura, identifiquei a causa raiz:

| Componente | Status | Problema |
|------------|--------|----------|
| Banco de Dados | OK | Tabelas `messages`, `inbox_view`, `conversations` estao na publicacao `supabase_realtime` |
| Cliente Supabase | INCOMPLETO | Nao tem opcoes de `realtime` configuradas (heartbeat, timeout, reconexao) |
| Hooks de Realtime | PARCIAL | Nao monitoram status da conexao nem forcam reconexao |
| Fallback Polling | LENTO | `refetchInterval: 15000` (15s) e muito longo para detectar falhas |

**Causa Raiz Principal**: O cliente Supabase em `src/integrations/supabase/client.ts` nao tem configuracoes de realtime. Quando a conexao WebSocket "cai silenciosamente" (timeout de rede, proxy, firewall corporativo), os hooks continuam "subscritos" em um canal morto, sem receber eventos.

**Por que funciona no Preview**: No preview, voce esta constantemente interagindo, o que mantem a conexao ativa. Em producao, apos alguns minutos de menor atividade ou variacoes de rede, a conexao pode ser encerrada pelo servidor/proxy sem notificacao ao cliente.

---

### Arquitetura Atual (Problematica)

```text
Cliente Supabase (sem opcoes realtime)
         |
         v
WebSocket conecta ao Supabase Realtime
         |
         v
[5-15 minutos de atividade normal]
         |
         v
Conexao "morre silenciosamente" (timeout/proxy/firewall)
         |
         v
Hooks continuam "subscritos" em canal morto
         |
         v
Mensagens nao chegam ate dar refresh
```

---

### Solucao Proposta

#### 1. Configurar Cliente Supabase com Opcoes de Realtime

Adicionar configuracoes de heartbeat, timeout e reconexao automatica:

**Arquivo**: `src/integrations/supabase/client.ts`

```typescript
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
    heartbeatIntervalMs: 15000, // Heartbeat a cada 15s (mantém conexao viva)
    reconnectAfterMs: (tries) => Math.min(tries * 1000, 10000), // Backoff exponencial até 10s
    timeout: 30000, // Timeout de 30s antes de considerar desconectado
  },
});
```

---

#### 2. Criar Hook Global de Monitoramento de Conexao Realtime

Criar um hook que monitora o estado da conexao e forca reconexao quando necessario:

**Arquivo novo**: `src/hooks/useRealtimeHealth.tsx`

Este hook:
1. Escuta eventos de conexao/desconexao do Supabase Realtime
2. Mostra indicador visual quando desconectado
3. Forca reconexao quando detecta problema
4. Invalida queries para refetch apos reconectar

---

#### 3. Reduzir Polling de Fallback

Reduzir o `refetchInterval` em hooks criticos para detectar falhas mais rapido:

**Arquivo**: `src/hooks/useInboxView.tsx`

```typescript
refetchInterval: 10000, // Reduzir de 15s para 10s
```

**Arquivo**: `src/hooks/useConversations.tsx`

```typescript
refetchInterval: 15000, // Reduzir de 30s para 15s
```

---

#### 4. Adicionar Reconexao Apos Visibilidade

Melhorar o listener de `visibilitychange` para forcar nova subscricao:

**Arquivo**: `src/hooks/useInboxView.tsx`

Adicionar logica que remove e recria os canais quando a aba volta ao foco apos muito tempo inativa.

---

### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/integrations/supabase/client.ts` | Modificar (CUIDADO: auto-gerado) | Adicionar opcoes de realtime |
| `src/hooks/useRealtimeHealth.tsx` | Criar | Hook de monitoramento global |
| `src/hooks/useInboxView.tsx` | Modificar | Reduzir refetchInterval, melhorar reconexao |
| `src/hooks/useConversations.tsx` | Modificar | Reduzir refetchInterval |
| `src/hooks/useMessages.tsx` | Modificar | Adicionar reconexao quando canal morre |
| `src/components/Layout.tsx` | Modificar | Adicionar indicador de conexao realtime |

---

### Secao Tecnica: Hook useRealtimeHealth

```typescript
// src/hooks/useRealtimeHealth.tsx
import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useRealtimeHealth() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Monitorar conexao
  useEffect(() => {
    // Criar canal de heartbeat
    const healthChannel = supabase
      .channel('realtime-health-check')
      .on('system', { event: 'connect' }, () => {
        console.log('[RealtimeHealth] Connected');
        setIsConnected(true);
        setLastPing(new Date());
      })
      .on('system', { event: 'disconnect' }, () => {
        console.log('[RealtimeHealth] Disconnected');
        setIsConnected(false);
      })
      .subscribe((status) => {
        console.log('[RealtimeHealth] Status:', status);
        setIsConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          setLastPing(new Date());
        }
      });

    // Ping periodico para verificar se conexao esta viva
    const pingInterval = setInterval(async () => {
      try {
        const channel = supabase.getChannels().find(c => c.topic === 'realtime-health-check');
        if (channel && channel.state !== 'joined') {
          console.log('[RealtimeHealth] Channel not joined, forcing reconnect');
          setIsConnected(false);
          // Forcar reconexao removendo e recriando
          await supabase.removeChannel(channel);
        }
      } catch (e) {
        console.error('[RealtimeHealth] Ping error:', e);
        setIsConnected(false);
      }
    }, 30000); // Verificar a cada 30s

    return () => {
      clearInterval(pingInterval);
      supabase.removeChannel(healthChannel);
    };
  }, []);

  // Reconectar quando visibilidade muda
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !isConnected) {
        console.log('[RealtimeHealth] Tab visible but disconnected, forcing refresh');
        queryClient.invalidateQueries({ queryKey: ['inbox-view'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isConnected, queryClient]);

  return { isConnected, lastPing };
}
```

---

### Secao Tecnica: Indicador Visual de Conexao

Adicionar badge no header quando desconectado:

```typescript
// Em Layout.tsx ou componente de header
const { isConnected } = useRealtimeHealth();

{!isConnected && (
  <div className="flex items-center gap-2 text-destructive">
    <WifiOff className="h-4 w-4" />
    <span className="text-xs">Reconectando...</span>
  </div>
)}
```

---

### Fluxo Apos Implementacao

```text
Cliente Supabase (COM opcoes realtime)
         |
         v
WebSocket conecta com heartbeat a cada 15s
         |
         v
[Conexao monitorada pelo useRealtimeHealth]
         |
         v
Se conexao morrer -> Reconexao automatica em 1-10s
         |
         v
Se tab ficar em background -> Catch-up ao voltar
         |
         v
Indicador visual avisa usuario se desconectado
```

---

### Resultado Esperado

| Metrica | Antes | Depois |
|---------|-------|--------|
| Conexao realtime estavel | NAO (morre silenciosamente) | SIM (heartbeat + reconexao) |
| Tempo de deteccao de falha | 15-30s (polling) | 1-5s (heartbeat) |
| Reconexao automatica | NAO | SIM (backoff exponencial) |
| Feedback ao usuario | Nenhum | Badge visual |
| Catch-up ao voltar | Parcial | Completo + reinscricao |

---

### Aviso Importante

O arquivo `src/integrations/supabase/client.ts` e marcado como "auto-gerado". Precisamos verificar se as alteracoes serao preservadas ou se devemos criar um wrapper separado para o cliente com configuracoes customizadas.
