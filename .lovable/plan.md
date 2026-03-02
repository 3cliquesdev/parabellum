

# Fix: Falso positivo financeiro + `deliverFlowMessage` não definida

## Problemas encontrados

### 1. Falso positivo na trava financeira (#FA3955F6)
O cliente enviou: *"Já conclui alteração do endereço de coleta e de **devolução** na Shopee. Gostaria de saber qual o próximo passo?"*

A regex `financialIntentPattern` fez match em `devolução` — mas aqui "devolução" se refere a **endereço de devolução** (logística), não a reembolso/estorno. A IA bloqueou a mensagem sem sequer tentar responder.

### 2. Erro crítico: `deliverFlowMessage is not defined`
Nos logs, outra conversa (#4168e4dc) crashou com `ReferenceError: deliverFlowMessage is not defined` no `process-chat-flow` (linha 1998). Quando o auto-avanço de nós `message` chega a um nó `transfer`, o código tenta chamar `deliverFlowMessage()` que **nunca foi declarada**. Isso causa crash no flow engine e a conversa cai em `waiting_human` sem resposta.

## Soluções

### 1. Refinar regex financeira (ambos os arquivos)
Tornar `devolução` mais contextual — exigir que NÃO esteja precedido de "endereço de" ou "local de". Adicionar negative lookbehind:
- `devolu[çc][ãa]o` → `(?<!endere[çc]o\s+de\s+)devolu[çc][ãa]o` (ou simplesmente remover `devolução` da trava de entrada e manter apenas na trava pós-resposta, já que "pedir devolução" é diferente de "endereço de devolução")

**Abordagem escolhida**: usar word boundary + negative lookbehind simples. Trocar para pattern que exija contexto de ação financeira (ex: "pedir/quero/solicitar devolução") em vez de match solto.

### 2. Corrigir `deliverFlowMessage` no `process-chat-flow`
A função não existe. No bloco de transfer após auto-avanço (linhas 1996-2004), substituir `deliverFlowMessage` por retornar as mensagens intermediárias junto com a resposta de transfer para o webhook entregar.

### 3. Resetar conversa #FA3955F6
SQL para devolver ao nó AI (`ia_entrada`) com status `active` para que o próximo envio do cliente seja processado pela IA normalmente.

### Arquivos editados
- `supabase/functions/process-chat-flow/index.ts` — fix `deliverFlowMessage` + refinar regex
- `supabase/functions/ai-autopilot-chat/index.ts` — refinar regex financeira de entrada
- Migration SQL — resetar conversa #FA3955F6

### Sem risco de regressão
- A regex refinada continua detectando "quero devolução", "pedir devolução", "reembolso" — apenas ignora "endereço de devolução"
- O fix de `deliverFlowMessage` usa o mesmo pattern de retorno já existente (retornar `response` + `transfer: true` para o webhook entregar)

