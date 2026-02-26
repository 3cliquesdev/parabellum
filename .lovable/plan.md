

# Plano: Diagnóstico Final + Fix Visual para Modo Teste

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico com EVIDÊNCIA DO BANCO

O Fluxo Principal **NÃO ESTÁ rodando**. Evidência:

```text
chat_flow_states (agora):
  flow_id: 20a05c59 (Rascunho) ← ÚNICO estado ativo
  status: waiting_input
  Nenhum estado do Fluxo Principal (3ea0d227) existe.

Logs process-chat-flow:
  02:18:01 → manualTrigger=true, flowId=20a05c59 (Rascunho) ✅
  02:18:27 → manualTrigger=false, "Oi" → encontra estado ativo do Rascunho → invalidOption ✅
  Nenhuma chamada ao Fluxo Principal.
```

O guard na linha 1332 (`isTestMode && !manualTrigger`) está funcionando. As mensagens que parecem do Principal são do **Rascunho** — que é uma cópia com conteúdo idêntico. Sem flow_id nas mensagens, é impossível distinguir visualmente.

## Problema Real

As mensagens do fluxo não carregam identificação de qual fluxo as gerou. Quando o rascunho tem o mesmo conteúdo do Principal, parecem duplicadas/vindas do Principal.

## Solução: Identificar cada mensagem com o nome do fluxo

### Mudança 1: `process-chat-flow/index.ts` — Adicionar flow_name no metadata de TODA mensagem do fluxo

Em TODAS as respostas do process-chat-flow que incluem `flowId`, adicionar também `flowName` para o frontend exibir.

Locais afetados:
- Resposta do manual trigger (linhas ~911-920)
- Resposta de invalidOption (linhas ~1034-1046)
- Resposta de próximo nó (linhas ~1321-1329)
- Resposta de ai_response (linhas ~1280-1304)

Adicionar `flowName: flow.name || activeState.chat_flows?.name` em cada JSON de resposta.

### Mudança 2: `meta-whatsapp-webhook/index.ts` — Salvar flow_name no metadata da mensagem

Quando o webhook salva a resposta do fluxo no banco (via send-meta-whatsapp), incluir no metadata da mensagem o `flowData.flowName`. Assim cada mensagem fica rastreável.

```typescript
// Ao salvar mensagem de resposta do fluxo
metadata: {
  flow_id: flowData.flowId,
  flow_name: flowData.flowName,
}
```

### Mudança 3: `MessagesWithMedia.tsx` — Exibir badge com nome do fluxo

Quando uma mensagem tem `metadata.flow_name`, exibir um badge pequeno abaixo do bubble:

```text
┌──────────────────────────────┐
│ Seja bem-vindo à 3 Cliques!  │
│ ...                          │
│                   23:18 ✓    │
└──────────────────────────────┘
  🔧 Master Flow + IA (Rascunho)
```

Isso elimina 100% da confusão: cada mensagem mostra de qual fluxo veio.

### Mudança 4: Nenhuma mudança no guard de bloqueio

O guard na linha 1332 já funciona corretamente. Não precisa de alteração.

## Resumo de arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/process-chat-flow/index.ts` | Adicionar `flowName` em todas as respostas JSON |
| `supabase/functions/meta-whatsapp-webhook/index.ts` | Salvar `flow_name` no metadata da mensagem no banco |
| `src/components/inbox/MessagesWithMedia.tsx` | Exibir badge com nome do fluxo quando disponível no metadata |

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — apenas adiciona informação, não altera lógica |
| Upgrade | Sim — elimina confusão visual entre fluxos |
| Kill Switch | Não afetado |
| Fluxo nunca mudo | Não afetado |

