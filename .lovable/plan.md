

## Plano: Corrigir Acesso de Gerentes às Tags de Conversa

### Problema Identificado

O Danilo Pereira (role: `support_manager`) está recebendo erro ao tentar adicionar tags em conversas.

**Causa Raiz:** A política RLS `admin_manager_can_manage_conversation_tags` na tabela `conversation_tags` só permite:
- `admin`
- `manager`

Mas **NÃO inclui** os roles de gerência:
- `support_manager` (Danilo)
- `general_manager`
- `cs_manager`
- `financial_manager`

**Nota:** As políticas da tabela `tags` (criar/editar tags) já estão corretas e incluem todos os gerentes. O problema é apenas na tabela `conversation_tags` (associar tags a conversas).

---

### Solução

Atualizar a política RLS da tabela `conversation_tags` para incluir todos os roles de gerência.

---

### Migração SQL

```sql
-- Remover política antiga restritiva
DROP POLICY IF EXISTS "admin_manager_can_manage_conversation_tags" ON public.conversation_tags;

-- Criar nova política incluindo todos os roles de gerência
CREATE POLICY "admin_manager_can_manage_conversation_tags"
ON public.conversation_tags
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'general_manager'::app_role) OR
  has_role(auth.uid(), 'support_manager'::app_role) OR
  has_role(auth.uid(), 'cs_manager'::app_role) OR
  has_role(auth.uid(), 'financial_manager'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'general_manager'::app_role) OR
  has_role(auth.uid(), 'support_manager'::app_role) OR
  has_role(auth.uid(), 'cs_manager'::app_role) OR
  has_role(auth.uid(), 'financial_manager'::app_role)
);
```

---

### Roles Afetados

| Role | Antes | Depois |
|------|-------|--------|
| admin | ✅ | ✅ |
| manager | ✅ | ✅ |
| general_manager | ❌ | ✅ |
| support_manager | ❌ | ✅ |
| cs_manager | ❌ | ✅ |
| financial_manager | ❌ | ✅ |
| sales_rep | ✅ (outra política) | ✅ |
| support_agent | ✅ (outra política) | ✅ |

---

### Impacto

- **Danilo Pereira** (support_manager) poderá adicionar/remover tags de conversas
- Outros gerentes também terão acesso
- Nenhuma alteração no frontend necessária
- Este é um problema **apenas para gerentes** - agentes e vendedores já funcionam por outras políticas

---

### Seção Tecnica

**Tabela afetada:** `public.conversation_tags`

**Política atual:**
```sql
has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
```

**Nova política:**
```sql
has_role(auth.uid(), 'admin'::app_role) OR 
has_role(auth.uid(), 'manager'::app_role) OR
has_role(auth.uid(), 'general_manager'::app_role) OR
has_role(auth.uid(), 'support_manager'::app_role) OR
has_role(auth.uid(), 'cs_manager'::app_role) OR
has_role(auth.uid(), 'financial_manager'::app_role)
```

**Usuario afetado:**
- Nome: Danilo Pereira
- Role: `support_manager`

