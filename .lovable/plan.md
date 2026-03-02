

# Fix: Conversa fica presa em "waiting_human" após remoção do consultor — Master Flow ignorado

## Problema

Quando você remove o consultor de um contato, a **conversa** continua com `ai_mode = 'waiting_human'`. Na próxima mensagem do cliente:

1. `process-chat-flow` vê `ai_mode=waiting_human` → retorna `skipAutoResponse: true`
2. Webhook envia "💬 Sua conversa já está na fila de atendimento"
3. **Master Flow nunca é consultado** porque a proteção bloqueia tudo

O problema: **remover consultor só limpa `consultant_id` no contato, mas não reseta o `ai_mode` das conversas ativas**.

## Solução

### 1. Resetar `ai_mode` ao desvincular consultor (`src/pages/Consultants.tsx`)

Na `unlinkMutation`, após setar `consultant_id: null`, também:
- Buscar conversas **abertas** desse contato que estejam em `waiting_human` ou `copilot`
- Atualizar para `ai_mode: 'autopilot'` e `assigned_to: null`

Isso libera o Master Flow para processar a próxima mensagem.

### 2. Mesmo fix em `src/components/contacts/ConsultantClientsSheet.tsx`

Aplicar a mesma lógica na mutation de unlink do sheet de clientes do consultor.

### 3. Adicionar flag `consultant_manually_removed` (migration SQL)

Coluna `consultant_manually_removed boolean DEFAULT false` na tabela `contacts` para que o webhook não re-atribua automaticamente (conforme plano anterior aprovado).

### 4. Proteger TRANSFER-PERSIST-LOCK no webhook

No `meta-whatsapp-webhook/index.ts`, antes de re-persistir `consultant_id` (~linha 824), verificar `consultant_manually_removed = true` e pular se sim.

### Arquivos editados
- **Migration SQL**: nova coluna `consultant_manually_removed`
- `src/pages/Consultants.tsx`: unlinkMutation reseta conversas ativas para autopilot + seta flag
- `src/components/contacts/ConsultantClientsSheet.tsx`: mesma lógica
- `supabase/functions/meta-whatsapp-webhook/index.ts`: guard no TRANSFER-PERSIST-LOCK

### Sem risco de regressão
- Só afeta conversas do contato desvinculado
- Conversas já fechadas não são tocadas
- Flag `consultant_manually_removed` é defensivo (default false)

