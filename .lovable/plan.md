

# Validação: Transferência "Preferência do Contato" (preferred)

Analisei o projeto atual e sigo as regras da base de conhecimento.

## A) Banco / Dados ✅

- **Migration existe** (`20260305143407`): adiciona `preferred_agent_id`, `preferred_department_id` em `contacts` e `default_department_id` em `organizations`, todos com FK correta.
- Os campos são nullable (ON DELETE SET NULL implícito via FK padrão).
- **Para testar**: é necessário preencher manualmente esses campos em contatos/organizações de teste via UI (ContactDialog e OrganizationDialog já têm os selects).

## B) Flow (Canvas) ✅

- **TransferPropertiesPanel.tsx**: opção `"preferred"` ("Preferência do Contato") disponível no select de tipo (linha 55).
- **Fallback obrigatório**: quando `transferType === "preferred"`, o select de departamento aparece com label "Departamento fallback" (linha 64).
- **Info box**: cadeia de prioridade exibida (linha 174+).
- **TransferNode.tsx**: badge "Preferência do Contato" + sub-badge "Fallback: DeptName".

## C) Webhook / Execução ✅

**process-chat-flow** (passthrough simples):
- Retorna `{ transfer: true, transferType: node.data?.transfer_type, departmentId: node.data?.department_id }` — sem resolver nada (4 pontos de retorno, todos consistentes).

**meta-whatsapp-webhook** (resolução completa, linhas 935-980):
1. `preferred_agent_id` existe → `assigned_to = agent_id`, `ai_mode = copilot` ✅
2. `preferred_department_id` existe (sem agent) → `department = preferred_dept` ✅
3. `organization.default_department_id` (sem overrides no contato) → `department = org_default` ✅
4. Nada configurado → usa `department_id` do nó (fallback) ✅

**Variáveis no contexto** (buildVariablesContext, process-chat-flow):
- `contact_preferred_agent_id`, `contact_preferred_department_id` expostos via loop de campos (linha 285).
- `org_default_department_id` buscado via query na organização (linhas 302-309).

## D) Regressão ✅

- `isConsultantTransfer` e `isPreferredTransfer` são flags independentes (linhas 922-923).
- `consultantId` é forçado `null` quando `isPreferredTransfer` (linha 987-988), evitando conflito.
- Types antigos (department/agent/queue/consultant) passam pelo branch existente sem alteração.
- A lógica de `consultant_manually_removed` continua intacta (linha 983).

## E) Evidência — Pendente de Teste Real

O código está 100% implementado e correto em todas as camadas. Para gerar evidência dos 4 cenários, é necessário:

1. **Preencher dados de teste** na UI:
   - Contato A: `preferred_agent_id = [agente X]`
   - Contato B: `preferred_department_id = [dept Y]`
   - Contato C: sem overrides, mas org com `default_department_id = [dept Z]`
   - Contato D: sem nada (fallback)

2. **Criar um Flow** com nó Transfer tipo "Preferência do Contato" + fallback dept.

3. **Enviar mensagens** de cada contato de teste pelo WhatsApp e verificar nos logs:
   - `👤 Preferred: atribuindo ao atendente preferido` (cenário 1)
   - `🏢 Preferred: departamento preferido do contato` (cenário 2)
   - `🏢 Preferred: departamento padrão da organização` (cenário 3)
   - `🔄 Preferred: usando fallback do nó` (cenário 4)

## Resumo

| Camada | Status |
|---|---|
| Migration SQL | ✅ Correto |
| Frontend (TransferNode + Panel) | ✅ Correto |
| Frontend (ContactDialog + OrgDialog) | ✅ Correto |
| Backend (process-chat-flow passthrough) | ✅ Correto |
| Backend (webhook resolução preferred) | ✅ Correto |
| Variáveis de contexto | ✅ Correto |
| Isolamento consultor vs preferred | ✅ Correto |
| Teste E2E com dados reais | ⏳ Pendente |

