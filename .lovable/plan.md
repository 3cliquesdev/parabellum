

# Plano: Alinhar Sistema ao Super Prompt Oficial v2.2

## Validação Completa do Código vs Contrato

Analisei cada contrato do Super Prompt v2.2 contra o código real. Resultado:

### ✅ Contratos 100% Alinhados

| Contrato | Status | Evidência |
|----------|--------|-----------|
| **3. ai_mode** | ✅ OK | `waiting_human`, `autopilot`, `copilot`, `disabled` corretamente usados |
| **4. Kill Switch** | ✅ OK | `ai_global_enabled` bloqueia IA/Fluxos/Fallbacks em todas funções |
| **5. Distribuição** | ✅ OK | `dispatch-conversations` exige `waiting_human` + `assigned_to IS NULL` + `department IS NOT NULL` |
| **6. Capacidade** | ✅ OK | Conta `waiting_human`, `copilot`, `disabled` na linha 330-332 |
| **9. Shadow Mode** | ✅ OK | `ai_shadow_mode` implementado com `suggested_only` |
| **10. Auto-Close** | ✅ OK | Controlado por departamento |

### ⚠️ Discrepância CRÍTICA #1: `go-offline-manual` ENCERRA conversas

**Contrato v2.2 (§1):**
> "Mudar status NUNCA encerra conversas"

**Código atual (`go-offline-manual/index.ts` linha 116-123):**
```typescript
// 4b. Fechar a conversa
await supabaseAdmin.from("conversations")
  .update({ 
    status: "closed",  // ❌ VIOLA CONTRATO
    closed_at: new Date().toISOString(),
    closed_by: agentId,
  })
```

**Correção necessária:**
- Remover fechamento automático
- Apenas remover `assigned_to` e mover para `waiting_human`

---

### ⚠️ Discrepância CRÍTICA #2: UI mente sobre comportamento

**Contrato v2.2 (§11):**
> "É proibido exibir: 'Suas conversas serão encerradas ao ficar offline'"

**`OfflineConfirmationDialog.tsx` (linha 52-64):**
```tsx
<li>Suas conversas serão <strong>encerradas</strong></li>  // ❌ PROIBIDO
<li>Conversas serão <strong>redistribuídas</strong></li>  // ❌ PROIBIDO
<li>A <strong>IA assumirá</strong> temporariamente</li>   // ❌ PROIBIDO
```

**Texto correto (§11):**
> "Você deixará de receber novas conversas. Suas conversas atuais permanecerão abertas e atribuídas."

---

### ⚠️ Discrepância #3: Status `away` não existe

**Contrato v2.2 (§1):**
> Status válidos: `online`, `busy`, `away`, `offline`

**Código atual (migration 20251125):**
```sql
CREATE TYPE availability_status AS ENUM ('online', 'busy', 'offline');
-- 'away' NÃO EXISTE
```

**Decisão:** Adicionar `away` ao enum OU remover do contrato?

---

### ⚠️ Discrepância #4: Trigger redistribui automaticamente

**Contrato v2.2 (§7):**
> "Conversas NÃO são redistribuídas automaticamente"

**Código atual (`redistribute_on_agent_offline` trigger):**
```sql
UPDATE conversations
SET assigned_to = NULL, ai_mode = 'autopilot'  -- ❌ REDISTRIBUI
WHERE assigned_to = OLD.id AND status = 'open';
```

**Correção:** O trigger deve apenas enviar para `waiting_human`, NÃO para `autopilot`

---

## Alterações Propostas

### Alteração 1: Corrigir `go-offline-manual/index.ts`

Comportamento novo (alinhado ao contrato):
- **NÃO** fechar conversas
- **NÃO** enviar CSAT (só em fechamento explícito)
- Remover `assigned_to` e mover para `waiting_human`
- Criar jobs de distribuição para outros agentes

```typescript
// ANTES (viola contrato)
status: "closed"

// DEPOIS (alinhado)
assigned_to: null,
ai_mode: 'waiting_human',
dispatch_status: 'pending'
// status permanece 'open'
```

### Alteração 2: Corrigir `OfflineConfirmationDialog.tsx`

```tsx
// ANTES (viola contrato)
<li>Suas conversas serão encerradas</li>
<li>IA assumirá temporariamente</li>

// DEPOIS (alinhado ao §11)
<li>Você deixará de receber novas conversas</li>
<li>Suas conversas atuais permanecerão abertas e na fila</li>
```

### Alteração 3: Corrigir trigger `redistribute_on_agent_offline`

```sql
-- ANTES (viola §7)
ai_mode = 'autopilot'

-- DEPOIS (alinhado)
ai_mode = 'waiting_human'  -- Todas vão para fila humana
```

### Alteração 4: Salvar Super Prompt como documento oficial

Criar arquivo `src/docs/SUPER_PROMPT_v2.2.md` com o contrato completo para referência.

---

## Decisão Pendente: Status `away`

O contrato menciona `away` mas o banco não tem. Opções:

1. **Adicionar `away`**: Migração para adicionar ao enum + UI para exibir
2. **Remover do contrato**: Se `busy` cobre o caso de uso

Qual preferência?

---

## Arquivos Modificados

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `supabase/functions/go-offline-manual/index.ts` | Refatorar (não fechar conversas) |
| `src/components/OfflineConfirmationDialog.tsx` | Corrigir textos |
| `supabase/migrations/xxx.sql` | Corrigir trigger |
| `src/docs/SUPER_PROMPT_v2.2.md` | Criar documento |

## Impacto

- **Zero breaking changes** para operação normal
- **Mudança de comportamento**: Offline não fecha mais conversas
- **100% alinhamento** com contrato de governança

