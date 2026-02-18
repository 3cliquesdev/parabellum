
## Correção: Usar Label da Regra como Texto de Matching

### Problema Real (confirmado pelos logs)
Os logs mostram que a **Regra 1** esta com keywords erradas (contem a frase da Regra 2). Alem disso, o fluxo atual exige que o usuario configure keywords separadamente do label, o que gera confusao.

### Solucao
Tornar o campo `keywords` **opcional** -- quando estiver vazio, o motor usa o **label da regra** como texto de matching. Isso simplifica a experiencia: o usuario escreve a frase no nome da regra e ela ja funciona como condicao.

### Mudancas Tecnicas

**1. Engine: `supabase/functions/process-chat-flow/index.ts` (funcao `evaluateConditionPath`)**

Na logica de keywords, adicionar fallback para label:

```
// Usar keywords se preenchido, senao usar label como fallback
const rawKw = (rule.keywords || "").trim() || (rule.label || "").trim();
```

O resto da logica de matching permanece identica (split por newline, normalize, includes).

**2. UI: `src/components/chat-flows/ChatFlowEditor.tsx`**

Atualizar o placeholder do campo keywords para indicar que e opcional:

```
placeholder="Opcional: frases extras (1 por linha). Se vazio, usa o nome da regra acima."
```

**3. Atualizar texto de ajuda**

Mudar a descricao de `"Cada regra usa palavras-chave (virgula = OR)"` para `"O nome da regra e usado como condicao. Opcionalmente, adicione frases extras no campo abaixo."`.

### Impactos
- Sem downgrade: quem ja usa keywords continua funcionando normalmente
- Upgrade: regras sem keywords agora funcionam usando o label
- O usuario nao precisa mais configurar keywords separadamente se o label ja contem a frase desejada
