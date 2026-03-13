

# PATCH — process-chat-flow/index.ts — 5 Novos Intents

## Escopo

8 alterações cirúrgicas no arquivo `supabase/functions/process-chat-flow/index.ts` para adicionar suporte a 5 novos intents: `pedidos`, `devolucao`, `saque`, `suporte_sistema`, `comercial_internacional`.

## Alterações

### 1. Destructuring do body (linha 776)
Adicionar `forcePedidosExit`, `forceDevolucaoExit`, `forceSaqueExit`, `forceSistemaexit`, `forceInternacionalExit` ao destructuring.

### 2. Declaração de variáveis (após linha 2592)
Adicionar 5 novas variáveis: `pedidosIntentMatch`, `devolucaoIntentMatch`, `saqueIntentMatch`, `sistemaIntentMatch`, `internacionalIntentMatch`.

### 3. Patterns de detecção (após linha 3247)
Inserir 5 blocos completos de detecção por regex (pedidos, devolução, saque, sistema, internacional), cada um com action pattern, ambiguous pattern, forbid flag, logging e ai_events insert — conforme especificado na mensagem do usuário.

### 4. Mapeamento intentData → flags (linhas 3385-3393)
Expandir condição de guard para incluir os 5 novos `*IntentMatch`. Adicionar mapeamento de novos intents (`pedidos`, `devolucao`, `saque`, `suporte_sistema`, `comercial_internacional`) e aliases (`suporte_pedidos` → pedidos, `comercial_nacional` → comercial, `humano` → suporte).

### 5. Salvar ai_exit_intent automático (após linha 3415)
Adicionar 5 blocos `if (*IntentMatch && !collectedData.ai_exit_intent)` para os novos intents.

### 6. Condição de saída do nó AI (linha 3417-3419)
Expandir o `if` e `exitReason` ternary para incluir os 5 novos intents. Expandir o `console.log` para incluir os novos flags.

### 7. Path selection (linhas 3471-3497)
Substituir o bloco inteiro de if/else com a nova hierarquia de prioridade: saque > financeiro > devolucao > pedidos > cancelamento > internacional > comercial > sistema > suporte > consultor > keyword > default.

### 8. Forbid flags no retorno aiNodeActive (linhas 3542-3546)
Adicionar 5 novos forbid flags: `forbidPedidos`, `forbidDevolucao`, `forbidSaque`, `forbidSistema`, `forbidInternacional`.

### 9. Handoff sem próximo nó (linhas 3558-3588)
Expandir o guard `!nextNode && (...)` para incluir os 5 novos `*IntentMatch`, e expandir `exitType`, `deptSearchName` e `handoffMsg` para os novos intents.

## Arquivo afetado
- `supabase/functions/process-chat-flow/index.ts` — 9 edições pontuais
- Deploy automático da edge function após as edições

