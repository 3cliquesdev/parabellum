
## Plano: Corrigir Permissão da Thaynara e Tornar Nota Opcional

### Problemas Identificados

#### 1. Thaynara não consegue transferir conversas
**Causa raiz:** A usuária "THAYNARA MARIANA SILVA" tem a role `user`, e a permissão `inbox.transfer` está **desabilitada** para essa role.

| Role | inbox.transfer |
|------|----------------|
| `admin` | Habilitado |
| `manager` | Habilitado |
| `sales_rep` | Habilitado |
| `support_agent` | Habilitado |
| `user` | **DESABILITADO** |

**Observação:** Existe outra Thaynara (`Thaynara da Silva`) com role `sales_rep` que consegue transferir normalmente.

#### 2. Nota de transferência é obrigatória
No componente `TransferConversationDialog.tsx`:
- Linha 65: `if (!selectedDepartmentId || !transferNote.trim()) return;`
- Linha 270: `disabled={!selectedDepartmentId || !transferNote.trim() || ...}`

Isso impede a transferência se a nota estiver vazia.

---

### Solução Proposta

#### Correção 1: Habilitar permissão para role `user`

Atualizar a permissão `inbox.transfer` para `enabled = true` na role `user` via SQL:

```sql
UPDATE role_permissions 
SET enabled = true, updated_at = now()
WHERE permission_key = 'inbox.transfer' AND role = 'user';
```

**OU (melhor opção):** Alterar a role da Thaynara de `user` para `sales_rep` ou `support_agent`, já que ela está no departamento Comercial e deveria ter as permissões adequadas.

#### Correção 2: Tornar nota de transferência opcional

Modificar `TransferConversationDialog.tsx`:

**Antes:**
```tsx
// Linha 65
if (!selectedDepartmentId || !transferNote.trim()) return;

// Linha 270
disabled={!selectedDepartmentId || !transferNote.trim() || transferMutation.isPending}
```

**Depois:**
```tsx
// Linha 65
if (!selectedDepartmentId) return;

// Linha 270
disabled={!selectedDepartmentId || transferMutation.isPending}
```

E atualizar o label do campo para remover o asterisco de obrigatório:
```tsx
// Linha 238
<Label htmlFor="transferNote">Nota de Transferência</Label>
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/TransferConversationDialog.tsx` | Remover obrigatoriedade da nota |
| SQL (role_permissions) | Habilitar `inbox.transfer` para role `user` |

---

### Benefícios

1. **Thaynara conseguirá transferir**: Após habilitar a permissão
2. **Fluxo mais ágil**: Transferências rápidas sem necessidade de justificativa
3. **Nota continua disponível**: Agentes podem adicionar contexto se desejarem, mas não é bloqueante

---

### Observação

Recomendo verificar se a role `user` deveria realmente ter acesso ao inbox e transferências. Se sim, a solução é habilitar a permissão. Se não, a Thaynara deveria ter a role `sales_rep` já que está no departamento Comercial.
