
## Plano: Tags por Conversa (Nao Persistentes Entre Chats)

### Problema Identificado

Atualmente as tags estao vinculadas ao **contato** (`customer_tags`), nao a **conversa** (`conversation_tags`). Isso faz com que:
- Quando o cliente abre novo chat, as tags do chat anterior aparecem
- Nao ha separacao entre atendimentos diferentes
- A timeline do contato nao registra corretamente as tags por atendimento

**Dados Confirmados:**
- Tabela `conversation_tags`: VAZIA (0 registros)
- Tabela `customer_tags`: 13+ registros recentes (tags sendo salvas errado)

---

### Arquitetura Proposta

**Dois Tipos de Tags com Propositos Distintos:**

| Tipo | Tabela | Vinculo | Proposito | Exemplo |
|------|--------|---------|-----------|---------|
| **Tag de Conversa** | `conversation_tags` | `conversation_id` | Classificar o atendimento atual | "Duvida Entrega", "Reclamacao" |
| **Tag de Contato** | `customer_tags` | `customer_id` | Caracteristicas permanentes do cliente | "VIP", "Inadimplente", "Cliente Antigo" |

---

### Alteracoes Necessarias

#### FASE 1: Corrigir Exibicao no ChatWindow

**Arquivo:** `src/components/ChatWindow.tsx`

**Mudancas:**
1. **Linha 105**: Remover `useCustomerTags` - tags do contato nao devem aparecer no header do chat
2. **Linhas 341-358**: Remover renderizacao de `customerTags` no header
3. Manter apenas `ConversationTagsSection` (que ja usa `conversation_tags` corretamente)

**Resultado:** Header do chat mostra apenas tags da conversa atual, nao do contato.

---

#### FASE 2: Corrigir Sidebar de Contato

**Arquivo:** `src/components/ContactDetailsSidebar.tsx`

**Mudancas:**
1. **Linha 181**: Manter `ContactTagsSection` para tags permanentes do contato
2. Adicionar nova secao "Tags desta Conversa" acima, usando `ConversationTagsSection`
3. Clarificar visualmente que tags do contato sao permanentes

**Resultado:** Sidebar mostra ambas as secoes claramente separadas.

---

#### FASE 3: Alterar Automacoes para Usar Conversation Tags

**Arquivos Edge Functions:**

1. **`supabase/functions/execute-automations/index.ts` (linhas 232-238)**
   - Atualmente: Insere em `customer_tags`
   - Mudanca: Inserir em `conversation_tags` usando `conversation_id` do contexto

2. **`supabase/functions/form-submit-v3/index.ts` (linhas 1405-1419)**
   - Mesma correcao: usar `conversation_tags` ao inves de `customer_tags`

**Resultado:** Automacoes classificam a conversa, nao o contato permanentemente.

---

#### FASE 4: Registrar Tags na Timeline ao Encerrar

**Arquivo:** `src/hooks/useCloseConversation.tsx` (ou edge function equivalente)

**Nova Logica:**
1. Ao encerrar conversa, buscar todas as tags em `conversation_tags`
2. Criar entrada em `interactions` (timeline) com as tags usadas
3. As tags ficam na timeline para historico, mas nao voltam em nova conversa

```text
Exemplo de registro na timeline:
"Conversa encerrada
Tags: Duvida Entrega, Pre-Carnaval
Duracao: 15 minutos"
```

**Resultado:** Historico completo de atendimentos com suas tags, mas tags nao persistem entre conversas.

---

### Compatibilidade Retroativa

- Tags ja existentes em `customer_tags` **permanecem** (sao tags do contato, nao da conversa)
- Novas tags adicionadas pelo botao do chat vao para `conversation_tags`
- Tags de automacao vao para `conversation_tags`
- Tags manuais na sidebar de contato vao para `customer_tags` (caracteristicas permanentes)

---

### Fluxo Visual Proposto

```text
NOVA CONVERSA
    │
    ▼
┌─────────────────────────────┐
│ Header do Chat              │
│ [Sem tags] + [+Tag]         │  ← Conversa nova = sem tags
└─────────────────────────────┘
    │
    ▼ (agente ou IA adiciona tag)
    │
┌─────────────────────────────┐
│ Header do Chat              │
│ [Duvida Entrega] [+Tag]     │  ← Tag vinculada a ESTA conversa
└─────────────────────────────┘
    │
    ▼ (encerra conversa)
    │
┌─────────────────────────────┐
│ Timeline do Contato         │
│ "Conversa encerrada"        │
│ Tags: Duvida Entrega        │  ← Registrado no historico
└─────────────────────────────┘
    │
    ▼ (cliente abre NOVA conversa)
    │
┌─────────────────────────────┐
│ Header do Chat              │
│ [Sem tags] + [+Tag]         │  ← Nova conversa = limpo
└─────────────────────────────┘
```

---

### Secao Tecnica: Arquivos a Modificar

| Arquivo | Linha(s) | Tipo | Descricao |
|---------|----------|------|-----------|
| `src/components/ChatWindow.tsx` | 105, 341-358 | Edicao | Remover customerTags do header |
| `src/components/ContactDetailsSidebar.tsx` | 181 | Edicao | Adicionar secao de tags da conversa |
| `supabase/functions/execute-automations/index.ts` | 232-238 | Edicao | Usar conversation_tags |
| `supabase/functions/form-submit-v3/index.ts` | 1405-1419 | Edicao | Usar conversation_tags |
| `src/hooks/useCloseConversation.tsx` | - | Edicao | Registrar tags na timeline ao encerrar |

### Garantia de Nao Quebrar

- Tags existentes permanecem intactas
- Funcionalidade de tags do contato continua existindo (sidebar)
- Apenas muda ONDE as novas tags sao salvas
- Timeline ganha historico mais completo
