

# Auditoria do Fluxo Ativo — Variável `senderPhone` não declarada

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Resultado da Auditoria

### Caminho normal (cliente manda "oi" hoje): ✅ OK
1. Webhook recebe → mensagem salva → Kill Switch check → `process-chat-flow` chamado → resposta estática ou `ai_response` → `send-meta-whatsapp` com `fromNumber` → **funciona**

### Caminho financeiro/comercial (cliente diz "saldo", "preço", etc.): ❌ CRASH

**Bug crítico encontrado**: a variável `senderPhone` é usada **6 vezes** no webhook (linhas 1086, 1147, 1194, 1293, 1353, 1397) mas **nunca foi declarada**. O nome correto no escopo é `fromNumber`.

Igualmente, `supabaseUrl` e `supabaseServiceKey` são usados **8 vezes** (linhas 1052, 1057, 1125, 1130, 1261, 1266, 1331, 1336) mas **nunca declarados**. O código usa `Deno.env.get("SUPABASE_URL")` e `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` em todos os outros pontos.

**Impacto**: Quando o `ai-autopilot-chat` retorna `financialBlocked` ou `commercialBlocked`, o bloco de re-invocação do `process-chat-flow` lança `ReferenceError: supabaseUrl is not defined` e o catch engole o erro. Depois, ao tentar enviar via `send-meta-whatsapp`, usa `senderPhone` (undefined) → envio falha silenciosamente (400). A conversa fica presa.

### Cenários afetados
| Cenário | Status |
|---------|--------|
| Fluxo normal (message, ask_options, transfer) | ✅ OK |
| Nó `ai_response` sem trigger financeiro/comercial | ✅ OK |
| Nó `ai_response` com keyword financeira (saldo, saque, reembolso) | ❌ CRASH |
| Nó `ai_response` com keyword comercial (comprar, preço, orçamento) | ❌ CRASH |
| CSAT | ✅ OK |
| Kill Switch | ✅ OK |
| Auto-close/inatividade | ✅ OK (corrigido sessão anterior) |

## Correção

### Arquivo: `supabase/functions/meta-whatsapp-webhook/index.ts`

**1. Substituir `senderPhone` → `fromNumber`** (6 ocorrências)
- Linhas 1086, 1147, 1194, 1293, 1353, 1397

**2. Substituir `supabaseUrl` → `Deno.env.get("SUPABASE_URL")!`** (4 ocorrências)
- Linhas 1052, 1125, 1261, 1331

**3. Substituir `supabaseServiceKey` → `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!`** (4 ocorrências)
- Linhas 1057, 1130, 1266, 1336

### Sem risco de regressão
- São apenas referências a variáveis que já existem no escopo correto (`fromNumber`, `Deno.env.get(...)`)
- Nenhuma lógica alterada — apenas corrige nomes de variáveis inexistentes para os equivalentes corretos

