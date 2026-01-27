
## Plano: Corrigir Estatísticas e Evoluir Sistema de IA com Fluxos Guiados

### Problemas Identificados

#### 1. 🔴 Bug: "0 clientes" no Kiwify (Prioridade ALTA)
**Causa:** O hook `useKiwifyStats` está filtrando `source = 'kiwify'`, mas os clientes foram importados como:
- `csv_import`: 10.406 contatos (77%)
- `null`: 1.942 contatos
- `meta_whatsapp`, `form`, etc.

**Dados reais:**
- Total de contatos: **13.315**
- Contatos com deals: **10.617**
- Deals totais: **11.061**

#### 2. 🟡 Clientes Importados via Planilha não aparecem
Os clientes importados têm `source = 'csv_import'`, não `'kiwify'`. Devem ser incluídos nas estatísticas.

#### 3. 🔵 Fluxo de Chat precisa ser a base da IA
O fluxo deve guiar a IA, não apenas disparar por keywords. Atualmente:
- O fluxo tem nós de `ai_response` que podem usar personas e KB
- Mas não há uma **estrutura guiada** para a IA seguir como "regra mestra"

#### 4. 🔵 Personas não estão sendo usadas pelos agentes
Cada agente humano deveria ter uma persona vinculada para a IA saber como agir quando auxilia ele.

---

### Solução Proposta

#### Correção 1: Ajustar Query de Clientes (Bug Imediato)

Modificar `useKiwifyStats.tsx` para contar **todos os contatos com deals** (não apenas source='kiwify'):

```typescript
// ANTES (errado)
.eq("source", "kiwify")

// DEPOIS (correto - contatos COM vendas/deals vinculados)
const { count: contactsWithDeals } = await supabase
  .from('deals')
  .select('contact_id', { count: 'exact', head: true })
  .not('contact_id', 'is', null);
```

Resultado esperado: **10.617 clientes | 11.061 deals** (em vez de 0 clientes)

---

#### Correção 2: Adicionar Fonte "Importação de Planilha"

Adicionar nova fonte no `KnowledgeSourcesWidget.tsx`:

| Fonte | Banco | Descrição |
|-------|-------|-----------|
| **Importação de Planilha** | Supabase: contacts (source=csv_import) | Clientes importados manualmente |

---

#### Correção 3: Fluxo Guiado como Base para IA

Criar conceito de **"Fluxo Mestre"** que a IA usa como base para atendimentos:

1. **Novo campo em `chat_flows`**: `is_master_flow` (boolean)
2. **Lógica no `ai-autopilot-chat`**:
   - Antes de responder, verificar se existe fluxo mestre ativo
   - Usar as etapas do fluxo como guia de atendimento
   - Ex: Cliente entrou → Saudação → Identificar necessidade → Buscar KB → Responder

```text
FLUXO MESTRE (Exemplo):
┌─────────────────────────────────────────────────────┐
│ [1] Saudação     → "Olá, sou a IA da empresa X"    │
│ [2] Identificar  → Perguntar o que precisa          │
│ [3] Classificar  → Detectar departamento/intenção   │
│ [4] Buscar KB    → Procurar resposta na base        │
│ [5] Responder    → Usar persona adequada            │
│ [6] Feedback     → Perguntar se resolveu            │
│ [7] Encerrar     → Despedida ou transferir humano   │
└─────────────────────────────────────────────────────┘
```

---

#### Correção 4: Vincular Persona ao Agente Humano

Adicionar campo `default_persona_id` na tabela `profiles` (agentes):
- Quando agente está em modo **copilot**, a IA usa a persona vinculada a ele
- Permite que cada agente tenha "personalidade IA" diferente

---

#### Correção 5: IA que "Pensa, Procura e Acha"

Melhorar o prompt da IA no `ai-autopilot-chat` para ser mais deliberativa:

```text
ANTES de responder:
1. ANALISE a pergunta do cliente
2. IDENTIFIQUE o que ele realmente precisa
3. BUSQUE na Base de Conhecimento (KB)
4. VERIFIQUE dados do pedido/cliente se aplicável
5. FORMULE a melhor resposta considerando o contexto
6. Se não tiver certeza, PERGUNTE antes de transferir
```

---

### Arquivos a Modificar

| Arquivo | Alteração | Prioridade |
|---------|-----------|------------|
| `src/hooks/useKiwifyStats.tsx` | Corrigir query para contar contatos com deals | 🔴 ALTA |
| `src/components/settings/KnowledgeSourcesWidget.tsx` | Adicionar fonte "Importação de Planilha" | 🟡 MÉDIA |
| `supabase/functions/ai-autopilot-chat/index.ts` | Adicionar lógica de "fluxo mestre" e pensamento deliberativo | 🔵 BAIXA |
| Migração SQL | Adicionar `is_master_flow` em `chat_flows` e `default_persona_id` em `profiles` | 🔵 BAIXA |

---

### Resultado Esperado

1. **Estatísticas corretas**: 10.617 clientes | 11.061 deals
2. **Visibilidade de todas as fontes**: KB, Kiwify, Tracking, Planilha, Sandbox
3. **IA guiada**: Segue o fluxo mestre como base de atendimento
4. **Personas ativas**: Agentes usam personas vinculadas
5. **IA inteligente**: Pensa antes de responder, busca ativamente

---

### Fluxo de Implementação

```text
FASE 1 (Imediato):
├── [1] Corrigir useKiwifyStats.tsx → 10.617 clientes
└── [2] Adicionar fonte "Importação de Planilha"

FASE 2 (Próxima Sprint):
├── [3] Criar conceito de "Fluxo Mestre"
├── [4] Vincular persona ao agente (profiles.default_persona_id)
└── [5] Melhorar prompt deliberativo da IA
```
