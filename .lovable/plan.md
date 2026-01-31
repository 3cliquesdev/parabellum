

# Plano: Octadesk-ification — Visual Enterprise Limpo

## Objetivo
Replicar o padrão visual do Octadesk no CRM, mantendo a arquitetura separada por canal (WhatsApp/Instagram). Foco em limpeza visual, remoção de **todos os emojis** e simplificação da lista de conversas.

---

## Diagnóstico Atual vs Octadesk

| Elemento | Estado Atual | Estilo Octadesk |
|----------|--------------|-----------------|
| Lista de conversas | Muitos badges, emojis 🤖🧠👤📥, chips coloridos | Texto + ícone canal + tempo |
| SLA | Emojis 🟡🟠🔶🔴 | Cor discreta sem emoji |
| Badge AI Mode | 🤖 Autopilot, 🧠 Copilot, 👤 Manual | Texto simples: "Autopilot", "Copilot", "Manual" |
| Badge Pool | "📥 Pool" | "Pool" ou ícone Users |
| Badge Cliente | "⭐ Cliente" + gradiente excessivo | "Cliente" simples |
| Header do chat | Emojis + múltiplos badges | Nome + canal + ações |
| Alertas IA off | "⚠️ IA Global está DESLIGADA" | Sem emoji, texto neutro |
| Modo teste | "🧪 Teste" | "Teste" |
| Conversa encerrada | "✅ Esta conversa foi encerrada" | Sem emoji |

---

## Componentes a Alterar

### 1. ConversationListItem.tsx (Prioridade Alta)

**Mudanças:**

| Local | Antes | Depois |
|-------|-------|--------|
| SLA emoji (L53-108) | `emoji: "🟡"`, `"🟠"`, `"🔶"`, `"🔴"` | `emoji: ""` (todos vazios) |
| L268 | `{sla.emoji && \`${sla.emoji} \`}` | Remover emoji do display |
| AI Mode Badge (L324-337) | `🤖`, `🧠`, `👤` | `Autopilot`, `Copilot`, `Manual` (texto) |
| Pool Badge (L347-349) | `📥 Pool` | `Pool` (só texto) |
| Cliente Badge (L291-298) | Gradiente excessivo + Star icon | Badge simples "Cliente" |
| Warning Badge (L352-356) | `⚠️` | Remover ou usar ícone AlertTriangle |

**Resultado esperado:** Lista limpa como Octadesk, apenas:
- Ícone do canal (já existe via ChannelIcon)
- Nome do contato
- Preview da mensagem (1 linha)
- Tempo discreto com cor (sem emoji)
- Badge numérica de unread (já correto)
- Badges essenciais: departamento (opcional), responsável

---

### 2. ChatWindow.tsx (Header + Alertas)

**Mudanças:**

| Local (linha) | Antes | Depois |
|---------------|-------|--------|
| L461 | `🧪 Teste` | `Teste` |
| L589-590 | `⚠️ IA Global está DESLIGADA...` | `IA Global está DESLIGADA...` |
| L608-609 | `✅ Esta conversa foi encerrada` | `Esta conversa foi encerrada` |
| L648 | `⚠️ IA Global DESLIGADA` | `IA Global DESLIGADA` |

---

### 3. SentimentBadge.tsx (OK — já sem emojis)
- Usa ícones Lucide (Angry, Meh, Smile) ✅
- Nenhuma mudança necessária

---

### 4. Outros arquivos com emojis contextuais

| Arquivo | Emoji | Ação |
|---------|-------|------|
| `ContactDetailsSidebar.tsx` L146 | `⚠️ Sessão não verificada` | Manter ícone AlertCircle, remover emoji |
| `EarlyWarningWidget.tsx` L104 | `🟢🟡🔴` para saúde | Trocar por badges coloridos sem emoji |
| `PublicQuote.tsx` L244 | `⚠️ Proposta Expirada` + `📅 Válida até` | Remover emojis |
| `KnowledgeArticleDialog.tsx` L128, L141 | `⚠️ Conteúdo gerado por IA` | Manter AlertTriangle icon, remover emoji |
| `TeamMemberProgressTable.tsx` L41 | `Atenção ⚠️` | `Atenção` (já tem ícone) |

---

## Resumo de Arquivos

| Arquivo | Mudanças | Impacto |
|---------|----------|---------|
| `ConversationListItem.tsx` | Remover ~10 emojis, simplificar badges | Alto |
| `ChatWindow.tsx` | Remover ~5 emojis de alertas/status | Médio |
| `ContactDetailsSidebar.tsx` | Remover 1 emoji | Baixo |
| `EarlyWarningWidget.tsx` | Trocar emojis de saúde por cores | Baixo |
| `PublicQuote.tsx` | Remover 2 emojis | Baixo |
| `KnowledgeArticleDialog.tsx` | Remover 2 emojis | Baixo |
| `TeamMemberProgressTable.tsx` | Remover 1 emoji | Baixo |

---

## Código das Mudanças Principais

### ConversationListItem.tsx — SLA sem emojis

```typescript
// ANTES (linhas 53-108):
emoji: "🟡", emoji: "🟠", emoji: "🔶", emoji: "🔴"

// DEPOIS:
emoji: "" // Todos vazios - cor já comunica urgência
```

### ConversationListItem.tsx — AI Mode Badge

```typescript
// ANTES (linhas 324-337):
{conversation.ai_mode === 'autopilot' && "🤖"}
{conversation.ai_mode === 'copilot' && "🧠"}
{conversation.ai_mode === 'disabled' && "👤"}

// DEPOIS:
{conversation.ai_mode === 'autopilot' && "Autopilot"}
{conversation.ai_mode === 'copilot' && "Copilot"}
{conversation.ai_mode === 'disabled' && "Manual"}
```

### ConversationListItem.tsx — Pool Badge

```typescript
// ANTES (linha 348):
📥 Pool

// DEPOIS:
Pool
```

### ConversationListItem.tsx — Cliente Badge simplificado

```typescript
// ANTES (linhas 291-298): gradiente excessivo
<Badge className="bg-gradient-to-r from-amber-100 to-yellow-100...">
  <Star className="h-2.5 w-2.5 fill-amber-500..." />
  Cliente
</Badge>

// DEPOIS: simples e neutro
<Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
  Cliente
</Badge>
```

### ConversationListItem.tsx — Warning Badge

```typescript
// ANTES (linha 354):
⚠️

// DEPOIS: apenas ícone AlertTriangle
<AlertTriangle className="h-3 w-3" />
```

### ChatWindow.tsx — Alertas

```typescript
// ANTES (L589):
'⚠️ IA Global está DESLIGADA...'

// DEPOIS:
'IA Global está DESLIGADA. Esta conversa está na fila IA mas não está sendo respondida. Clique em "Assumir" para atender.'
```

---

## Seção Técnica

### Padrões Octadesk a seguir:

1. **Cores comunicam urgência** — emojis são redundantes
2. **Ícones Lucide** — já existem, usar em vez de emojis
3. **Texto neutro** — "Autopilot", não "🤖"
4. **Badges minimalistas** — bordas finas, cores suaves
5. **Hierarquia clara** — nome > preview > tempo

### Não alterar:
- Lógica de negócio
- ChannelIcon (já correto)
- SentimentBadge (já usa ícones)
- Estrutura de dados

---

## Garantias de Não-Regressão

- **Zero alteração de lógica** — apenas visual
- **Mantém todos os badges funcionais** — só remove emojis
- **Cores de SLA intactas** — urgência comunicada por cor
- **WhatsApp/Instagram separados** — arquitetura preservada

---

## Critério de Aceite Visual

| Elemento | Esperado |
|----------|----------|
| Lista de conversas | Zero emojis, texto limpo |
| SLA | Cor + tempo (ex: "4h" em laranja) |
| AI Mode | Badge texto: "Autopilot", "Copilot", "Manual" |
| Pool | Badge texto: "Pool" |
| Cliente | Badge simples: "Cliente" |
| Alertas | Texto neutro, ícones Lucide |
| Header do chat | Limpo, profissional |

