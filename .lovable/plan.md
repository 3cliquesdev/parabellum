

## Correção: Motor de Condições + Build

### Problema
Linha 192 do `process-chat-flow/index.ts` faz `.split(",")` nas keywords. Quando a frase é "Olá, vim pelo email e gostaria de saber mais sobre a ressaca de carnaval", ela quebra em:
- "olá" (match genérico em tudo)
- "vim pelo email e gostaria de saber mais sobre a ressaca de carnaval"

A Regra 1 captura por "olá" antes da Regra 2 ser avaliada.

### Solução
Trocar o separador de vírgula para **quebra de linha** (`\n`). Assim a frase completa (com vírgulas naturais) é tratada como uma keyword única.

### Mudanças

**1. `supabase/functions/process-chat-flow/index.ts` (linha 192)**

```
// ANTES
const terms = (rule.keywords || "").split(",").map(...)

// DEPOIS
const rawKw = rule.keywords || "";
const terms = rawKw.includes("\n")
  ? rawKw.split("\n").map((t: string) => t.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')).filter(Boolean)
  : [rawKw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')].filter(Boolean);
```

Isso garante que cada linha do campo keywords é uma frase completa para matching.

**2. `src/components/chat-flows/ChatFlowEditor.tsx` (linha 729)**

Atualizar placeholder:
```
// ANTES
placeholder="Palavras-chave separadas por vírgula"

// DEPOIS
placeholder="Uma frase por linha (Enter para nova frase)"
```

**3. Build fix: `package-lock.json`**

Remover as 17 referências a `mux-embed`, `@mux/mux-player`, e `@mux/mux-player-react` e resetar `bun.lock`.

### Impactos
- Sem downgrade: quem já usa keywords curtas pode colocar uma por linha
- Upgrade: frases completas com vírgulas agora funcionam corretamente
- Build: erro de workspace resolvido

