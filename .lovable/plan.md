

## Plano: Corrigir 3 Problemas do Sistema de Chat Flows

### Diagnostico

| # | Problema | Causa Raiz | Impacto |
|---|----------|-----------|---------|
| 1 | Navegacao travada no editor | ChatFlowEditorPage nao tem Layout wrapper + ReactFlow captura cliques | Usuario fica "preso" no editor |
| 2 | Duplicar fluxo nao existe | Funcionalidade nunca foi implementada | Usuario precisa recriar fluxos do zero |
| 3 | Toggle ativar/desativar nao funciona | Politica RLS sem WITH CHECK para UPDATE | UPDATE silenciosamente falha |

---

### Parte 1: Corrigir Navegacao no Editor

**Problema:** A rota `/settings/chat-flows/:id/edit` nao esta envolta em `<Layout>`, diferente das outras rotas de settings.

**Arquivo:** `src/App.tsx` (linha 254)

**Antes:**
```tsx
<Route path="/settings/chat-flows/:id/edit" element={<ProtectedRoute requiredPermission="settings.chat_flows"><ChatFlowEditorPage /></ProtectedRoute>} />
```

**Depois:**
```tsx
<Route path="/settings/chat-flows/:id/edit" element={<ProtectedRoute requiredPermission="settings.chat_flows"><Layout fullHeight><ChatFlowEditorPage /></Layout></ProtectedRoute>} />
```

**OU** (opcao mais simples - manter fullscreen mas melhorar o botao de voltar):

Manter a pagina fullscreen (como um editor profissional) mas garantir que o botao de voltar funcione:

**Arquivo:** `src/pages/ChatFlowEditorPage.tsx`

Adicionar `type="button"` e usar `window.location.href` como fallback:

```tsx
<Button 
  type="button"
  variant="ghost" 
  size="icon" 
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    // Fallback para garantir navegacao
    try {
      navigate("/settings/chat-flows");
    } catch {
      window.location.href = "/settings/chat-flows";
    }
  }}
  onMouseDown={(e) => e.stopPropagation()}
  className="hover:bg-muted z-[100]"
>
```

**Recomendacao:** Manter editor fullscreen (melhor UX para drag-drop) e corrigir o botao.

---

### Parte 2: Adicionar Funcionalidade de Duplicar Fluxo

**2.1 Criar hook useDuplicateChatFlow**

**Arquivo:** `src/hooks/useChatFlows.tsx`

Adicionar novo hook apos `useToggleChatFlowActive`:

```typescript
export function useDuplicateChatFlow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (flow: ChatFlow) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data: result, error } = await supabase
        .from("chat_flows")
        .insert({
          name: `${flow.name} (Copia)`,
          description: flow.description,
          triggers: flow.triggers,
          trigger_keywords: flow.trigger_keywords,
          department_id: flow.department_id,
          support_channel_id: flow.support_channel_id,
          flow_definition: flow.flow_definition,
          is_active: false, // Sempre inativo ao duplicar
          priority: flow.priority,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat-flows"] });
      toast({
        title: "Fluxo duplicado",
        description: "O fluxo foi duplicado com sucesso. Ele foi criado como inativo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao duplicar fluxo",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
```

**2.2 Adicionar botao na UI**

**Arquivo:** `src/pages/ChatFlows.tsx`

Importar hook e icone:
```tsx
import { Copy } from "lucide-react";
import { useDuplicateChatFlow } from "@/hooks/useChatFlows";
```

Instanciar hook:
```tsx
const duplicateFlow = useDuplicateChatFlow();
```

Adicionar item no dropdown (apos "Editar"):
```tsx
<DropdownMenuItem onClick={() => duplicateFlow.mutate(flow)}>
  <Copy className="h-4 w-4 mr-2" />
  Duplicar
</DropdownMenuItem>
```

---

### Parte 3: Corrigir Toggle Ativar/Desativar (RLS)

**Problema:** A politica RLS atual tem `WITH CHECK` como `nil`, o que significa que UPDATE pode falhar silenciosamente.

**Arquivo:** Nova migration SQL

```sql
-- Dropar e recriar politica com WITH CHECK
DROP POLICY IF EXISTS "Admins and managers can manage chat flows" ON chat_flows;

CREATE POLICY "Admins and managers can manage chat flows"
ON chat_flows
FOR ALL
TO public
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager', 'general_manager', 'support_manager', 'cs_manager', 'financial_manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'manager', 'general_manager', 'support_manager', 'cs_manager', 'financial_manager')
  )
);
```

**Nota:** Tambem adicionei `cs_manager` e `financial_manager` para consistencia com outras politicas do sistema.

---

### Arquivos a Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `src/pages/ChatFlowEditorPage.tsx` | Modificar | Melhorar botao de voltar com fallbacks |
| `src/hooks/useChatFlows.tsx` | Modificar | Adicionar hook useDuplicateChatFlow |
| `src/pages/ChatFlows.tsx` | Modificar | Adicionar botao de duplicar no dropdown |
| Migration SQL | Criar | Corrigir RLS policy com WITH CHECK |

---

### Ordem de Implementacao

1. Corrigir RLS policy (migration SQL)
2. Criar hook useDuplicateChatFlow
3. Adicionar botao Duplicar na UI
4. Melhorar botao de voltar no editor

---

### Secao Tecnica: Detalhes Adicionais

**Por que o botao de voltar pode nao funcionar:**

O ReactFlow usa event listeners globais para drag-drop e interacao com o canvas. Quando o usuario clica no botao de voltar, o evento pode ser capturado pelo ReactFlow antes de chegar no handler do botao.

Solucoes implementadas:
1. `e.preventDefault()` + `e.stopPropagation()` - ja existe
2. Adicionar `onMouseDown={(e) => e.stopPropagation()}` - capturar evento mais cedo
3. Usar `type="button"` explicitamente
4. Aumentar z-index para `z-[100]` no botao
5. Fallback com `window.location.href` caso navigate falhe

**Por que o toggle pode falhar silenciosamente:**

Sem `WITH CHECK`, o Postgres permite a operacao mas nao aplica a mudanca se a politica USING nao for satisfeita no momento do UPDATE. Isso causa um "update silencioso" onde a query retorna sucesso mas nenhuma linha e afetada.

---

### Resultado Esperado

| Problema | Antes | Depois |
|----------|-------|--------|
| Navegacao no editor | Botao de voltar nao responde | Funciona com multiplos fallbacks |
| Duplicar fluxo | Nao existe | Botao "Duplicar" no menu de opcoes |
| Toggle ativar/desativar | Falha silenciosamente | Funciona corretamente com RLS correto |

