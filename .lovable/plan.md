
# Simplificar Tags: Universal, Obrigatoria, e Apenas Uma por Conversa

## Problema Atual

1. A validacao de encerramento exige tags com `category === "conversation"` -- tags de outras categorias nao contam, confundindo o usuario
2. O sistema permite marcar multiplas tags na conversa -- o usuario quer apenas UMA tag por vez
3. A sidebar direita (tags do contato) e o header (tags da conversa) confundem porque parecem a mesma coisa

## Solucao

### 1. ConversationTagsSection -- Permitir apenas 1 tag por vez

**Arquivo:** `src/components/inbox/ConversationTagsSection.tsx`

- Ao selecionar uma nova tag, **remover a tag anterior automaticamente** antes de adicionar a nova
- Se ja tem 1 tag e o usuario clica em outra, faz swap (remove antiga, adiciona nova)
- Manter exibicao de apenas 1 badge
- Trocar checkbox por radio-like behavior (clique simples seleciona/troca)

### 2. CloseConversationDialog -- Remover filtro de categoria

**Arquivo:** `src/components/CloseConversationDialog.tsx`

- Linha 49: Mudar `conversationTags.some(t => t.category === "conversation")` para `conversationTags.length > 0`
- Qualquer tag vinculada a conversa satisfaz a exigencia
- Atualizar texto do aviso para: "Adicione uma tag antes de encerrar"

### 3. Edge Function -- Remover filtro de categoria no backend

**Arquivo:** `supabase/functions/close-conversation/index.ts`

- Linhas 108-122: Mudar validacao de `ct.tags?.category === "conversation"` para simplesmente verificar se `conversationTags?.length > 0`
- Mensagem de erro: "Conversa nao pode ser encerrada sem uma tag vinculada."

### 4. Sidebar ContactTagsSection -- Manter como esta

A sidebar de tags do contato (`ContactTagsSection`) continua funcionando normalmente para tags permanentes do perfil. Nao afeta o encerramento.

## Resumo das Mudancas

| Arquivo | Mudanca |
|---------|---------|
| `ConversationTagsSection.tsx` | Limitar a 1 tag por conversa (swap automatico) |
| `CloseConversationDialog.tsx` | Aceitar qualquer tag (remover filtro `category`) |
| `close-conversation/index.ts` | Aceitar qualquer tag no backend (remover filtro `category`) |

## Impacto

- Zero regressao: tags do contato na sidebar nao mudam
- Upgrade de UX: usuario seleciona 1 tag, sistema troca automaticamente
- Validacao simplificada: qualquer tag conta para encerrar
- Backend e frontend alinhados na mesma regra
