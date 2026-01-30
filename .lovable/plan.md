
# Plano de Upgrade: Histórico Completo para IA

## Diagnóstico Confirmado

Analisei o projeto e confirmo que **não é bug do Lovable** - a arquitetura está funcionando corretamente:

| Componente | Status | Limite |
|------------|--------|--------|
| Banco de dados (messages) | ✅ Persistente | Sem TTL/expiração |
| Frontend (useMessages) | ✅ 10.000 msgs | Cache 30 min |
| **IA (ai-autopilot-chat)** | ⚠️ **LIMITADO** | **Apenas 10 mensagens** |

O problema está no parâmetro `maxHistory = 10` que limita o contexto passado para a IA.

---

## Alterações Necessárias

### 1. Aumentar Contexto da IA (Edge Function)

**Arquivo:** `supabase/functions/ai-autopilot-chat/index.ts`

- Aumentar `maxHistory` de **10 para 50** mensagens por padrão
- Adicionar suporte para buscar contexto expandido quando necessário
- Implementar "resumo de histórico" para conversas muito longas (evitar exceder tokens da IA)

```text
ANTES:
const { maxHistory = 10 } = parsedBody;
.limit(maxHistory);

DEPOIS:
const { maxHistory = 50 } = parsedBody;
.limit(maxHistory);
```

### 2. Aumentar Contexto do Streaming (Edge Function)

**Arquivo:** `supabase/functions/ai-chat-stream/index.ts`

- Aumentar limite de histórico de **10 para 30** mensagens

```text
ANTES:
getConversationHistory(supabaseClient, conversationId, 10)

DEPOIS:
getConversationHistory(supabaseClient, conversationId, 30)
```

### 3. Configuração Dinâmica (Opcional - Banco)

Adicionar configuração no `system_configurations` para ajuste dinâmico:

| Chave | Valor | Descrição |
|-------|-------|-----------|
| `ai_max_history_messages` | `50` | Mensagens enviadas para IA |
| `ai_max_history_summary` | `true` | Resumir conversas longas |

---

## Impacto Técnico

### Performance
- Aumentar de 10 para 50 mensagens aumenta tokens de contexto em ~5x
- Custo de IA pode aumentar ~20-40% por resposta
- Latência pode aumentar ~100-200ms

### Limites Recomendados
- **50 mensagens**: Ideal para CRM (contexto completo sem explodir tokens)
- **100+ mensagens**: Requer implementar "resumo de histórico" para não exceder limite de tokens do modelo

---

## Arquivos que Serão Modificados

1. `supabase/functions/ai-autopilot-chat/index.ts` - Aumentar maxHistory
2. `supabase/functions/ai-chat-stream/index.ts` - Aumentar limite no streaming
3. **(Opcional)** Banco de dados - Adicionar configuração dinâmica

---

## Resultado Esperado

Após implementação:
- IA terá acesso a **50 mensagens** de histórico por padrão
- Contexto de conversa preservado para atendimentos longos
- Histórico de CRM funcionará como esperado

