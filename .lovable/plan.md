
## Plano: Bloquear Vendedores de Assumir Conversas de Outros Departamentos

### Resumo do Problema
A Thaynara (sales_rep do departamento Comercial) está conseguindo **assumir manualmente** conversas do departamento Suporte. O sistema de roteamento automático funciona corretamente, mas não há validação no momento de "Assumir" que impeça vendedores de pegar conversas de outros departamentos.

### Causa Raiz
1. O hook `useTakeControl` não valida o departamento da conversa contra o departamento/role do usuário
2. A visibilidade do inbox pode estar permitindo que ela veja conversas de Suporte (possivelmente via navegação direta ou filtro de URL)

### Solucao Proposta

#### 1. Adicionar Validacao de Departamento no `useTakeControl`
Modificar o hook para verificar se o usuario tem permissao para assumir conversas do departamento antes de permitir a acao.

**Arquivo:** `src/hooks/useTakeControl.tsx`

```typescript
// Adicionar validacao de departamento antes de permitir assumir
const conversation = await supabase
  .from('conversations')
  .select('id, department')
  .eq('id', conversationId)
  .single();

const userProfile = await supabase
  .from('profiles')
  .select('department')
  .eq('id', user.id)
  .single();

const userRole = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id)
  .single();

// Roles com acesso total podem assumir qualquer conversa
const FULL_ACCESS_ROLES = ['admin', 'manager', 'general_manager', 'support_manager', 'cs_manager'];
if (!FULL_ACCESS_ROLES.includes(userRole?.role)) {
  // Verificar compatibilidade de departamento
  // sales_rep so pode assumir conversas de Comercial
  // support_agent so pode assumir conversas de Suporte
  if (conversation.department !== userProfile.department) {
    throw new Error('Voce nao tem permissao para assumir conversas deste departamento');
  }
}
```

#### 2. Adicionar Feedback Visual no Botao "Assumir"
Desabilitar ou ocultar o botao "Assumir" quando a conversa for de um departamento diferente.

**Arquivo:** `src/components/ChatWindow.tsx`

```typescript
// Adicionar prop para verificar compatibilidade
const canTakeControl = useMemo(() => {
  if (!conversation?.department || !userProfile?.department) return true;
  if (hasFullInboxAccess(role)) return true;
  return conversation.department === userProfile.department;
}, [conversation, userProfile, role]);

// Desabilitar botao se nao pode assumir
<Button
  onClick={() => setConfirmTakeControlOpen(true)}
  disabled={takeControl.isPending || !canTakeControl}
  title={!canTakeControl ? "Voce so pode assumir conversas do seu departamento" : ""}
>
```

#### 3. Revisar Visibilidade do Inbox
Garantir que `useInboxView` nao mostre conversas de outros departamentos para roles restritos, mesmo via navegacao direta.

**Arquivo:** `src/hooks/useInboxView.tsx`

Verificar se o filtro de departamento via URL (`?dept=...`) esta sendo respeitado apenas para roles com acesso total.

### Alteracoes de Arquivos

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| `src/hooks/useTakeControl.tsx` | Adicionar validacao de departamento |
| `src/components/ChatWindow.tsx` | Desabilitar botao para departamentos incompativeis |
| `src/hooks/useInboxView.tsx` | Revisar filtro de departamento via URL |

### Resultado Esperado
- Sales reps so poderao assumir conversas do departamento Comercial
- Support agents so poderao assumir conversas do departamento Suporte
- Managers/Admins continuam podendo assumir qualquer conversa
- Mensagem de erro clara se tentarem assumir conversa de outro departamento

### Secao Tecnica

**Logica de Validacao:**
```text
┌─────────────────────────────────────────────────────────────────┐
│ Usuario clica em "Assumir"                                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Verificar role do usuario                                    │
│    ├─ Se FULL_ACCESS_ROLES → Permitir                           │
│    └─ Senao → Continuar validacao                               │
│                                                                 │
│ 2. Buscar departamento da conversa                              │
│                                                                 │
│ 3. Verificar compatibilidade:                                   │
│    ├─ sales_rep: conversa.department IN [Comercial, Vendas]     │
│    ├─ support_agent: conversa.department IN [Suporte]           │
│    └─ Outro: Bloquear                                           │
│                                                                 │
│ 4. Se incompativel → Exibir erro e cancelar                     │
│    Se compativel → Prosseguir com assumir                       │
└─────────────────────────────────────────────────────────────────┘
```

**Impacto:**
- Nenhuma funcionalidade existente sera quebrada
- Apenas adiciona uma camada de validacao
- Thaynara podera continuar assumindo conversas de Comercial normalmente
- Conversas de Suporte so poderao ser assumidas por support_agents ou managers
