
## Plano: Permitir Visibilidade de Conversas do Departamento para Agentes

### Diagnóstico Confirmado

Identifiquei **dois problemas distintos** que estão causando o comportamento incorreto:

---

### Problema 1: Filtro de departamento usa nome hardcoded

O hook `useDepartmentsByRole.tsx` filtra departamentos por **nome exato**:

```javascript
// ATUAL (problemático)
case "support_agent":
  return departments.filter((d) =>
    ["Suporte", "Support", "Atendimento"].some(
      (name) => d.name.toLowerCase() === name.toLowerCase()
    )
  );
```

**Resultado:** Miguel está no departamento "Suporte Sistema", mas o código só reconhece o departamento chamado "Suporte" (nome exato). Isso faz com que o código trate Miguel como se ele não tivesse departamento válido.

---

### Problema 2: Agentes não veem conversas de colegas

Mesmo que o departamento fosse reconhecido corretamente, a query em `useInboxView.tsx` só permite:
- Conversas atribuídas ao usuário (`assigned_to = userId`)
- Conversas **não atribuídas** do departamento (`assigned_to IS NULL`)

**Mas NÃO permite ver conversas atribuídas a colegas** do mesmo departamento (como as 29 conversas da Mabile).

---

### Dados Atuais

| Métrica | Valor |
|---------|-------|
| Departamento do Miguel | Suporte Sistema (fd4fcc90-22e4-4127-ae23-9c9ecb6654b4) |
| Conversas totais abertas | 33 |
| Atribuídas ao Miguel | 4 |
| Atribuídas à Mabile | 29 |
| Não atribuídas | 0 |
| Miguel consegue ver | Apenas 3-4 (suas próprias) |

---

## Solução Proposta

### Mudança 1: Usar departamento do PERFIL ao invés de filtro por nome

Em vez de filtrar departamentos por nomes hardcoded, o sistema deve usar o departamento configurado no perfil do usuário.

**Arquivo:** `src/hooks/useDepartmentsByRole.tsx`

```javascript
// NOVO: Buscar departamento do próprio perfil do usuário
case "support_agent":
case "sales_rep":
case "financial_agent":
  // Retornar departamento do perfil do usuário (a ser passado como parâmetro)
  // Se não tiver, fallback para lista vazia (só vê o que está atribuído a ele)
  return userDepartmentId ? [userDepartmentId] : [];
```

**Alternativa mais simples:** Usar `startsWith` ou `includes` ao invés de comparação exata:

```javascript
case "support_agent":
  return departments.filter((d) =>
    d.name.toLowerCase().startsWith("suporte") ||
    d.name.toLowerCase().includes("support")
  );
```

---

### Mudança 2: Adicionar visibilidade de conversas de colegas

**Arquivo:** `src/hooks/useInboxView.tsx` (linhas 67-86)

```javascript
// ATUAL (restritivo)
query = query.or(
  `assigned_to.eq.${userId},and(assigned_to.is.null,department.in.(${departmentIds.join(",")}))`
);

// NOVO (permite ver colegas)
query = query.or(
  `assigned_to.eq.${userId},department.in.(${departmentIds.join(",")})`
);
```

Essa mudança permite que agentes vejam **todas** as conversas do departamento, mesmo as atribuídas a colegas.

---

### Mudança 3: Atualizar edge function get-inbox-counts

**Arquivo:** `supabase/functions/get-inbox-counts/index.ts`

A função `applyVisibility` precisa da mesma lógica:
- Usar departamento do perfil do usuário
- Incluir conversas atribuídas a colegas do mesmo departamento

---

### Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useDepartmentsByRole.tsx` | Mudar para usar perfil do usuário ou filtro mais flexível |
| `src/hooks/useInboxView.tsx` | Permitir ver conversas de colegas do mesmo departamento |
| `supabase/functions/get-inbox-counts/index.ts` | Mesma lógica de visibilidade |

---

### Impacto e Mitigação

| Impacto | Mitigação |
|---------|-----------|
| Agentes verão mais conversas (do departamento inteiro) | Isso é o comportamento esperado |
| Contagem na sidebar vai bater com lista de conversas | Resolvido pela consistência |
| Retrocompatível | Sim, apenas EXPANDE visibilidade |

---

### Rollback

Se necessário reverter, basta restaurar os filtros originais (`assigned_to.eq.${userId}` + `assigned_to.is.null`).

---

### Recomendação

Sugiro a **abordagem mais robusta**: usar o departamento do perfil do usuário como fonte única da verdade, em vez de filtros por nome. Isso evita problemas futuros quando departamentos forem renomeados ou novos forem criados.
