

# Plano Enterprise: Distribuicao Inteligente com Monitoramento de Fila

## Problemas Identificados

1. **Limite minimo forcado de 30 conversas por agente** (linha 531 do dispatcher): `Math.max(configuredMax ?? 30, 30)` ignora o valor configurado por time e forca 30, sobrecarregando agentes.
2. **Backoff exponencial lento**: Apos falha, o retry espera 30s, 60s, 120s, 300s -- conversas ficam paradas por ate 5 minutos antes de nova tentativa.
3. **Sem prioridade por SLA**: Todas as conversas pendentes sao tratadas iguais na fila. Conversas com SLA critico nao tem prioridade sobre novas.
4. **Sem painel de monitoramento**: Nao existe visibilidade da fila de distribuicao (jobs pendentes, escalados, tempo de espera).
5. **Requeue limitado**: Jobs escalados so voltam a fila quando um agente fica online ou no ciclo geral do cron.

## Solucao em 4 Frentes

### Frente 1: Corrigir Limite de Capacidade por Agente

**Arquivo**: `supabase/functions/dispatch-conversations/index.ts`

Remover o `Math.max(..., 30)` que forca minimo de 30. Usar o valor configurado no `team_settings`, com fallback para 10 (valor sensato):

```text
// ANTES (problematico):
const maxChats = Math.max(configuredMax ?? 30, 30);

// DEPOIS (respeita configuracao do time):
const maxChats = configuredMax ?? 10;
```

Isso permite que gestores configurem limites reais (ex: 5, 8, 15) por time.

### Frente 2: Reduzir Backoff e Adicionar Prioridade SLA

**Arquivo**: `supabase/functions/dispatch-conversations/index.ts`

**2a. Backoff mais agressivo:**
```text
// ANTES: 30s, 60s, 120s, 300s
// DEPOIS: 10s, 20s, 30s, 60s
```

**2b. Prioridade SLA na ordenacao dos jobs:**

Adicionar um campo `sla_priority` calculado dinamicamente baseado no tempo de espera da conversa. Conversas esperando ha mais tempo ganham prioridade maior.

Na query de jobs pendentes, adicionar JOIN com `conversations.last_message_at` para calcular tempo de espera e reordenar:

```text
// Ordenar por: prioridade base DESC, tempo de espera DESC, created_at ASC
```

### Frente 3: Painel de Monitoramento da Fila (Dashboard Widget)

**Novos arquivos:**
- `src/components/widgets/DispatchQueueWidget.tsx` -- Widget para o dashboard operacional
- `src/hooks/useDispatchQueue.tsx` -- Hook para buscar dados da fila

**O widget mostra:**

| Metrica | Descricao |
|---------|-----------|
| Jobs Pendentes | Quantidade de conversas aguardando distribuicao |
| Jobs Escalados | Conversas que excederam tentativas maximas |
| Tempo Medio Espera | Media de tempo das conversas na fila |
| Conversas Criticas | Aguardando ha mais de 15 minutos |
| Agentes Disponiveis | Online com capacidade livre |
| Taxa de Sucesso | % de atribuicoes bem-sucedidas nas ultimas 24h |

**Integracao:** Adicionar ao `OperationalDashboardTab.tsx` na ROW 2 ou como nova ROW.

### Frente 4: Re-distribuicao Automatica por Ciclo

**Arquivo**: `supabase/functions/dispatch-conversations/index.ts`

Melhorar a funcao `requeueEscalatedJobs` para tambem verificar jobs "stuck" (pendentes ha mais de 5 minutos sem progresso) e forca-los de volta ao inicio da fila:

```text
// Alem de requeue de escalated, tambem reprocessar:
// - Jobs pending com next_attempt_at > 3 min atras (stuck)
// - Resetar attempts para dar nova chance
```

## Sequencia de Implementacao

1. Migration SQL (se necessario para novos indices)
2. Edge Function `dispatch-conversations` (correcoes de capacidade, backoff, SLA)
3. Hook `useDispatchQueue` + Widget `DispatchQueueWidget`
4. Integrar widget no dashboard operacional

## Impacto

- **Zero regressao**: Todas as mudancas sao upgrades no dispatcher existente
- **Performance**: Conversas serao distribuidas mais rapido com backoff reduzido
- **Visibilidade**: Gestores poderao ver a fila em tempo real
- **Controle**: Limites de capacidade por time passam a funcionar conforme configurado

