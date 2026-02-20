

## Corrigir Tickets da MAbile Nao Chegando ao Financeiro

### Causa Raiz
A Edge Function `generate-ticket-from-conversation` usa `service_role` (acesso total ao banco) mas nao preenche dois campos essenciais:

1. **`created_by`**: fica NULL porque o ID do usuario nao e extraido do token de autenticacao
2. **`department_id`**: fica NULL porque a categoria "financeiro" nao e mapeada para o departamento correspondente

Consequencias:
- O ticket nao aparece na fila do departamento Financeiro (sem `department_id`)
- A MAbile nao consegue ver o ticket que ela mesma criou (sem `created_by`, a regra de seguranca nao reconhece como "criado por ela")
- Stakeholders/notificacoes internas ficam vazias (`ticket.created_by` e NULL)

### Solucao

**Arquivo: `supabase/functions/generate-ticket-from-conversation/index.ts`**

1. **Extrair usuario do JWT**: Ler o header `Authorization`, criar um segundo cliente Supabase com o token do usuario para obter `auth.getUser()`, e usar o ID como `created_by`

2. **Mapear categoria para departamento**: Buscar o departamento pelo nome correspondente a categoria:
   - `financeiro` -> departamento "Financeiro"
   - `tecnico` -> departamento "Suporte Sistema" (ou similar)
   - Fallback: NULL se nao encontrar (comportamento atual)

3. **Inserir `created_by` e `department_id`** no INSERT do ticket

4. **Corrigir stakeholders**: O bloco de notificacoes ja usa `ticket.created_by`, entao com a correcao, o criador sera adicionado automaticamente como stakeholder

### Codigo (resumo das mudancas)

```text
// 1. Extrair user do JWT (novo)
const authHeader = req.headers.get('Authorization');
let actorId = null;
if (authHeader) {
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: { user } } = await userClient.auth.getUser();
  actorId = user?.id ?? null;
}

// 2. Mapear categoria -> departamento (novo)
const categoryToDept: Record<string, string> = {
  financeiro: 'Financeiro',
  tecnico: 'Suporte Sistema',
};
const deptName = categoryToDept[category];
let departmentId = null;
if (deptName) {
  const { data: dept } = await supabase
    .from('departments')
    .select('id')
    .ilike('name', deptName)
    .maybeSingle();
  departmentId = dept?.id ?? null;
}

// 3. Inserir com os campos corretos
.insert({
  ...campos_existentes,
  created_by: actorId,        // NOVO
  department_id: departmentId, // NOVO
})
```

### Tickets Existentes Orfaos (correcao retroativa)

Executar uma query de correcao para os tickets ja criados sem `department_id`:

```sql
UPDATE tickets
SET department_id = 'af3c75a9-2e3f-49f1-8e0b-7fb3f4b5ee45'
WHERE department_id IS NULL
  AND category = 'financeiro'
  AND created_at > '2026-02-01';
```

### Impacto
- Upgrade: tickets criados via conversa agora chegam ao departamento correto e tem rastreabilidade completa
- Fallback: se JWT nao estiver presente ou departamento nao existir, mantem NULL (comportamento atual)
- Zero regressao: o INSERT policy e `WITH CHECK (true)`, entao adicionar `created_by` e `department_id` nao quebra nada
- Notificacoes internas passam a funcionar corretamente para este fluxo
