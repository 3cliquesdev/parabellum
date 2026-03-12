

# Auditoria Final — BUG CRÍTICO no Roteamento de Intenção (condition_v2)

## Resumo das Verificações Anteriores (OK)

| Componente | Status |
|---|---|
| `financialGuardInstruction` no prompt | OK — injetado na linha 6036 |
| `ambiguousFinancialDetected` → desambiguação | OK |
| `financialInfoPattern` (regex restrita) | OK — `dúvida` exige contexto financeiro |
| `path = 'ai_exit'` para financial/commercial | OK — linha 2290 |
| `ai_exit_intent` salvo no collectedData | OK — linhas 2220-2227 |
| Handoff fallback quando nextNode=null | OK — linha 2354 |

## BUG CRÍTICO ENCONTRADO: condition_v2 "Roteamento de Intenção"

O nó "Roteamento de Intenção" (condition_v2) tem 2 regras:
- Regra 1: "Financeiro" → `field: "ai_exit_intent"`, `check_type: "has_data"`
- Regra 2: "Cancelamento" → `field: "ai_exit_intent"`, `check_type: "has_data"`

**Ambas verificam o MESMO campo com o MESMO check (`has_data`)**. A primeira regra SEMPRE ganha. O ramo "Cancelamento" NUNCA é alcançado.

```text
FLUXO REAL:
  ai_exit_intent = "comercial" (cancelamento)
  → Regra 1 "Financeiro": ai_exit_intent has_data? SIM ✅
  → Retorna handle "Financeiro" → RAMO ERRADO!
  → Regra 2 "Cancelamento": NUNCA AVALIADA

FLUXO ESPERADO:
  ai_exit_intent = "comercial"
  → Regra 1 "Financeiro": ai_exit_intent == "financeiro"? NÃO ✗
  → Regra 2 "Cancelamento": ai_exit_intent == "comercial"? SIM ✅
  → Retorna handle "Cancelamento" → RAMO CORRETO
```

### Causa Raiz

O avaliador V2 (`evaluateConditionV2Path`, linha 496) só suporta `has_data`/`no_data` para regras com campo. NÃO suporta comparação de VALOR (`equals`). O V1 (`evaluateCondition`, linha 417) tem `equals`, mas o V2 não herda essa lógica.

Adicionalmente, a UI (linha 1091-1094) ESCONDE o campo de keywords quando um field é selecionado, mostrando apenas "Verifica se o campo tem dado". Não existe opção para o usuário configurar `equals` + valor esperado.

## Plano de Correção (3 alterações)

### Correção 1: Engine — Adicionar `equals` ao avaliador V2

**Arquivo**: `supabase/functions/process-chat-flow/index.ts` (função `evaluateConditionV2Path`, ~linha 512)

Quando `rule.field` está setado E `rule.check_type === 'equals'`, comparar o valor do campo contra os termos do `rule.keywords` (separados por vírgula):

```typescript
if (rule.field) {
  const fieldValue = getVar(rule.field, collectedData, contactData, conversationData);
  const checkType = rule.check_type || 'has_data';
  const hasValue = fieldValue !== null && fieldValue !== undefined && fieldValue !== false && String(fieldValue).trim().length > 0;
  
  if (checkType === 'equals') {
    // Comparar valor do campo contra keywords (separados por vírgula)
    const expectedValues = (rule.keywords || rule.label || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    const actualValue = String(fieldValue || '').toLowerCase().trim();
    isMatch = expectedValues.some(ev => actualValue === ev);
  } else {
    isMatch = checkType === 'has_data' ? hasValue : !hasValue;
  }
}
```

Mesma alteração na função `evaluateConditionPath` (V1 multi-regra, ~linha 460) para consistência.

### Correção 2: UI — Permitir `equals` + valor esperado em regras com campo

**Arquivo**: `src/components/chat-flows/ChatFlowEditor.tsx` (~linha 1091)

Quando `rule.field` está setado, mostrar:
1. Selector de check_type: "Tem dado" / "Não tem dado" / "É igual a"
2. Quando `equals` selecionado, mostrar input de "Valor esperado" (reutiliza field keywords)

```tsx
{rule.field && (
  <div className="space-y-1.5">
    <Select value={rule.check_type || 'has_data'} onValueChange={(val) => updateConditionRule(idx, 'check_type', val)}>
      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="has_data">✅ Tem dado</SelectItem>
        <SelectItem value="no_data">❌ Não tem dado</SelectItem>
        <SelectItem value="equals">🎯 É igual a</SelectItem>
      </SelectContent>
    </Select>
    {rule.check_type === 'equals' && (
      <Input
        value={rule.keywords || ''}
        onChange={(e) => updateConditionRule(idx, 'keywords', e.target.value)}
        placeholder="Valor esperado (ex: financeiro)"
        className="h-7 text-xs"
      />
    )}
    {rule.check_type !== 'equals' && (
      <p className="text-[10px] text-muted-foreground italic">
        ✅ Verifica se o campo tem dado — não precisa de keywords
      </p>
    )}
  </div>
)}
```

### Correção 3: Catálogo de Variáveis — Adicionar `ai_exit_intent`

**Arquivo**: `src/components/chat-flows/variableCatalog.ts`

Adicionar ao `CONDITION_CONVERSATION_FIELDS`:
```typescript
{ value: "ai_exit_intent", label: "Intenção de Saída IA" },
```

## Resultado Esperado

Após a correção, o usuário configura:
- Regra "Financeiro": campo=`ai_exit_intent`, check=`equals`, valor=`financeiro`
- Regra "Cancelamento": campo=`ai_exit_intent`, check=`equals`, valor=`comercial`

| Mensagem | ai_exit_intent | Regra 1 (financeiro?) | Regra 2 (comercial?) | Ramo |
|---|---|---|---|---|
| "Quero sacar" | financeiro | ✅ match | — | Financeiro ✅ |
| "Quero comprar" | comercial | ✗ | ✅ match | Cancelamento ✅ |
| Outro exit | outro valor | ✗ | ✗ | Outros ✅ |

