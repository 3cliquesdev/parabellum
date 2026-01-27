

## Plano: Corrigir Distribuição de Conversas com Hierarquia de Departamentos

### Problema Identificado

O sistema de distribuição está falhando porque:

1. **Estrutura Atual**:
   - Todos os agentes estão no departamento "Suporte" (pai)
   - Subdepartamentos "Suporte Pedidos" e "Suporte Sistema" existem, mas nenhum agente está atribuído a eles
   - Quando uma conversa é marcada para "Suporte Sistema", o roteamento busca `department = 'Suporte Sistema'` e não encontra ninguém

2. **Lógica no `route-conversation`** (linha 403-404):
   ```typescript
   if (resolvedDepartmentId) {
     agentsQuery = agentsQuery.eq('department', resolvedDepartmentId);
   }
   ```
   Isso filtra apenas agentes com departamento EXATO, ignorando a hierarquia.

3. **Skills não estão vinculadas aos subdepartamentos**:
   - "Suporte Técnico" é uma skill separada
   - "Suporte Sistema" é um subdepartamento
   - Não há relação automática entre eles

---

### Solução Proposta

Modificar a lógica de roteamento para considerar a **hierarquia de departamentos** (parent_id):

- Se a conversa é para "Suporte Sistema", buscar agentes em:
  1. "Suporte Sistema" (exato)
  2. "Suporte" (pai) - como fallback

---

### Alterações Técnicas

#### 1. Edge Function: `route-conversation/index.ts`

**Adicionar lógica de fallback para departamento pai**:

```typescript
// Após resolver o departamento, buscar também o parent_id para fallback
let parentDepartmentId: string | null = null;

if (resolvedDepartmentId) {
  const { data: deptData } = await supabase
    .from('departments')
    .select('parent_id')
    .eq('id', resolvedDepartmentId)
    .single();
  
  if (deptData?.parent_id) {
    parentDepartmentId = deptData.parent_id;
    console.log(`[route-conversation] 📂 Department has parent: ${parentDepartmentId}`);
  }
}
```

**Modificar a query de agentes para incluir hierarquia** (linha 403-404):

```typescript
// Filtrar por departamento com fallback para pai
if (resolvedDepartmentId) {
  // Buscar agentes no departamento OU no pai
  const deptIds = [resolvedDepartmentId];
  if (parentDepartmentId) {
    deptIds.push(parentDepartmentId);
  }
  agentsQuery = agentsQuery.in('department', deptIds);
}
```

**Priorizar agentes do subdepartamento** (após buscar agentes):

```typescript
// Ordenar: subdepartamento primeiro, depois pai
if (parentDepartmentId && genericAgents.length > 0) {
  genericAgents.sort((a, b) => {
    if (a.department === resolvedDepartmentId && b.department !== resolvedDepartmentId) return -1;
    if (b.department === resolvedDepartmentId && a.department !== resolvedDepartmentId) return 1;
    return 0;
  });
}
```

---

#### 2. Mapeamento Skill ↔ Subdepartamento (Opcional/Futuro)

Criar uma tabela de mapeamento para vincular skills a subdepartamentos:

| Subdepartamento | Skill Relacionada |
|-----------------|-------------------|
| Suporte Sistema | Suporte Técnico |
| Suporte Pedidos | (nenhuma específica) |

Assim, quando uma conversa for para "Suporte Sistema", o sistema também priorizará agentes com skill "Suporte Técnico".

---

### Fluxo de Distribuição Corrigido

```text
Conversa → Departamento: "Suporte Sistema"
                │
                ▼
1. Buscar agentes em "Suporte Sistema"
   └─→ Encontrou? ✓ Atribui
                │
                ▼ (se não)
2. Buscar agentes no pai "Suporte"
   └─→ Encontrou? ✓ Atribui (com prioridade para quem tem skill "Suporte Técnico")
                │
                ▼ (se não)
3. Fila de espera
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/route-conversation/index.ts` | Adicionar lógica de hierarquia de departamentos |

---

### Benefícios

- **Retrocompatível**: Agentes no departamento pai continuam recebendo conversas dos subdepartamentos
- **Flexível**: Permite migrar gradualmente agentes para subdepartamentos específicos
- **Priorização correta**: Agentes no subdepartamento exato têm prioridade sobre os do pai
- **Sem breaking changes**: O sistema existente continua funcionando

---

### Observação

Após implementar, você pode opcionalmente mover agentes específicos para "Suporte Sistema" ou "Suporte Pedidos" na tela de usuários, e eles terão prioridade no roteamento para essas filas.

