

# Plano: Ajustar 2 pontos antes de implementar isolamento de teste

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Ponto 1: `continue` vs `return` no webhook

**Resultado da análise:** `continue` é o correto.

O webhook usa um loop `for...of` aninhado (linha 226-228) iterando sobre `entry.changes` e mensagens. O padrão em todo o arquivo é `continue` para pular para a próxima mensagem no loop — usado em 15+ lugares (CSAT, kill switch, skipAutoResponse, etc.).

O bloco `skipAutoResponse` (linha 667-733) já usa `continue` na linha 733 para o caso geral. O guard de test mode cairá dentro desse mesmo bloco (`flowData.skipAutoResponse = true` + `flowData.reason === 'test_mode_manual_only'`).

**Ação:** Adicionar tratamento específico DENTRO do bloco `if (flowData.skipAutoResponse)` (linha 667), antes da mensagem de "aguarde" (linha 675). Se `reason === 'test_mode_manual_only'`, fazer `continue` direto — sem enviar mensagem de aguarde, sem mudar `ai_mode`:

```typescript
// Linha ~668, após o log
if (flowData.reason === 'test_mode_manual_only') {
  console.log("[meta-whatsapp-webhook] 🧪 TEST MODE: Ignorando - apenas fluxos manuais");
  continue;
}
```

Isso é seguro porque:
- `continue` pula para a próxima mensagem no loop (comportamento padrão do webhook)
- Não envia mensagem de "aguarde" (desnecessária em teste)
- Não altera `ai_mode` (preserva estado da conversa)

## Ponto 2: Frontend renderiza `sender_type: 'system'`

**Resultado da análise:** Sim, já renderiza com estilo visual diferente.

Em `MessagesWithMedia.tsx` (linhas 200-210), mensagens com `sender_type === 'system'` são renderizadas como:
- Centralizadas (`justify-center`)
- Badge cinza arredondado (`bg-muted/50 px-4 py-2 rounded-full`)
- Texto pequeno (`text-xs text-muted-foreground`)
- Prefixo 📢

**Ação:** Nenhuma mudança necessária no frontend. A mensagem separadora `🧪 ─── TESTE DE FLUXO INICIADO ───` será renderizada automaticamente como system message centralizada.

## Resumo de implementação

| Mudança | Arquivo | Tipo |
|---|---|---|
| Guard test mode no `skipAutoResponse` | `meta-whatsapp-webhook/index.ts` | `continue` dentro do bloco existente |
| Mensagem separadora system | `process-chat-flow/index.ts` | Insert antes de `deliverManualMessage` |
| Frontend | Nenhum | Já renderiza `sender_type: 'system'` corretamente |

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — apenas adiciona guards dentro de blocos existentes |
| Upgrade | Sim — isola visualmente e logicamente testes de fluxo |
| Kill Switch | Não afetado |
| Fluxo nunca mudo | Não afetado |

