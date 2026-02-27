

# Fix: forbidFinancial não está sendo passado no webhook + fluxo deve ser soberano

## Problema Identificado

Há **dois problemas**:

1. **`forbidFinancial` não é passado no webhook**: No arquivo `meta-whatsapp-webhook/index.ts` linha 919-933, o `flow_context` construído no CASO 3 passa `forbidQuestions` e `forbidOptions` mas **nunca inclui `forbidFinancial`**. Resultado: a IA no `ai-autopilot-chat` recebe `forbidFinancial: false` (default) e responde normalmente sobre cancelamentos/reembolsos.

2. **Conceito mais amplo**: Quando o exit keyword é ativado (ex: "cancelar", "reembolso"), o `process-chat-flow` detecta o keyword e avança para o próximo nó. Porém, na **mesma interação** onde o keyword é detectado, o fluxo retorna `aiNodeActive: false` e o resultado deveria ser o conteúdo do próximo nó (mensagem, transfer, etc). Isso já funciona corretamente após a correção anterior de inatividade. O problema real é que a IA responde **antes** do exit keyword ser avaliado — porque o webhook chama a IA quando `aiNodeActive: true`, e o exit keyword só é checado no **próximo** ciclo.

Porém, olhando o código com mais cuidado: o `process-chat-flow` é chamado **primeiro** (linha 637), e ele verifica exit keywords (linha 1162-1164). Se keyword match, ele NÃO retorna `aiNodeActive: true` — ele segue para `findNextNode`. Então o fluxo **deveria** avançar. O problema é exclusivamente que o `forbidFinancial` não chega na IA, então quando NÃO há exit keyword configurado (ou a palavra não bate exatamente), a IA responde sobre cancelamentos normalmente.

## Correção (1 arquivo)

### `supabase/functions/meta-whatsapp-webhook/index.ts` — Linha 932

Adicionar `forbidFinancial` ao flow_context do CASO 3:

```typescript
forbidOptions: (flowData as any).forbidOptions ?? true,
forbidFinancial: (flowData as any).forbidFinancial ?? false,  // ← ADICIONAR
```

## Verificação adicional recomendada

Confirmar que os exit_keywords do nó de IA no fluxo "Master Flow + IA Entrada" incluem termos como "cancelar", "cancelamento", "reembolso" para que o fluxo avance ao invés da IA tentar resolver.

## Resultado esperado

1. Se exit keyword bate → fluxo avança para próximo nó (transfer, mensagem, etc.)
2. Se exit keyword NÃO bate mas `forbidFinancial` está ativo → IA informa que não resolve financeiro e sugere falar com humano
3. Em ambos os casos, o comportamento é controlado pelo fluxo

