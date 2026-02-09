

# Buscar consultor pelo email coletado no fluxo durante a transferencia

## Problema

O fluxo esta correto:
1. Condicao detecta a keyword
2. "Perguntar Email" coleta o email do cliente
3. "Resposta IA" processa (objetivo: verificar consultor)
4. "Transferir" move para o departamento Customer Success

Porem, na hora da transferencia, o sistema so verifica o `consultant_id` do contato da conversa (vinculado pelo telefone). Como esse contato nao tem consultor, a conversa vai para o pool do departamento.

O email informado pelo cliente (ex: `libertecdados@gmail.com`) fica salvo no `collectedData.email` do fluxo, mas ninguem usa esse dado para buscar o consultor.

## Solucao

Expandir a logica de transferencia em ambos os pipelines para:

1. Verificar `consultant_id` do contato da conversa (logica atual)
2. Se nao encontrar, verificar se existe um email no `collectedData` do fluxo
3. Se nao encontrar no collectedData, buscar email nas mensagens recentes do cliente
4. Com o email encontrado, buscar um contato que tenha `consultant_id` definido
5. Se encontrar, atribuir a conversa a esse consultor

## Alteracoes

### 1. `supabase/functions/meta-whatsapp-webhook/index.ts` (~linha 753)

Expandir o bloco apos buscar o `consultant_id` do contato. Se for NULL:
- Verificar `flowData.collectedData?.email`
- Se nao tiver, buscar email nas ultimas 10 mensagens do cliente
- Usar o email encontrado para buscar contato com `consultant_id`

### 2. `supabase/functions/ai-autopilot-chat/index.ts` (~linha 2457)

Mesma logica expandida no bloco de transferencia do fluxo:
- Verificar `flowResult.collectedData?.email`
- Fallback: buscar email nas mensagens recentes
- Usar email para encontrar consultor

### 3. Nenhuma alteracao em `process-chat-flow`

O `collectedData` ja e retornado junto com a resposta de transferencia (linha 690). Nenhuma mudanca necessaria.

## Fluxo esperado

```text
Cliente envia "consultor" → Condicao = true
  → Perguntar Email → cliente responde "libertecdados@gmail.com"
    → collectedData.email = "libertecdados@gmail.com"
      → Resposta IA processa
        → Transfer node → process-chat-flow retorna:
          { transfer: true, departmentId: "...", collectedData: { email: "libertecdados@gmail.com" } }
          
Pipeline de transferencia:
  1. consultant_id do contato da conversa → NULL
  2. Busca email no collectedData → "libertecdados@gmail.com"
  3. Busca contato com esse email + consultant_id → Paulo Lopes
  4. assigned_to = Paulo Lopes, ai_mode = copilot
  → Conversa aparece na caixa do Paulo Lopes
```

## Detalhes tecnicos

Trecho a ser adicionado em ambos os pipelines (apos a busca atual do consultant_id):

```typescript
// Se nao tem consultor pelo contato, buscar pelo email coletado no fluxo
if (!consultantId) {
  let emailToSearch: string | null = null;

  // 1. Tentar do collectedData do fluxo
  const collectedEmail = flowData.collectedData?.email;
  if (collectedEmail && typeof collectedEmail === 'string') {
    emailToSearch = collectedEmail.toLowerCase().trim();
  }

  // 2. Fallback: buscar email nas mensagens recentes
  if (!emailToSearch) {
    const { data: recentMsgs } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', conversation.id)
      .eq('sender_type', 'contact')
      .order('created_at', { ascending: false })
      .limit(10);

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    for (const msg of recentMsgs || []) {
      const match = msg.content?.match(emailRegex);
      if (match) {
        emailToSearch = match[0].toLowerCase();
        break;
      }
    }
  }

  // 3. Buscar contato com esse email que tenha consultor
  if (emailToSearch) {
    const { data: emailContact } = await supabase
      .from('contacts')
      .select('consultant_id')
      .ilike('email', emailToSearch)
      .not('consultant_id', 'is', null)
      .maybeSingle();

    if (emailContact?.consultant_id) {
      consultantId = emailContact.consultant_id;
      console.log("[pipeline] Consultor encontrado pelo email:", emailToSearch, "→", consultantId);
    }
  }
}
```

## Impacto

| Item | Status |
|------|--------|
| Regressao | Zero - apenas adiciona fallback de busca por email |
| Suporte geral | Sem alteracao |
| Contatos sem consultor | Pool do departamento (atual) |
| Consultor offline | Atribuido mesmo assim |
| Performance | 1-2 queries adicionais, apenas no caminho de transferencia quando consultant_id e NULL |

