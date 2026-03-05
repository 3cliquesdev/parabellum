

# Plano: Roteamento por Preferência do Contato (Overrides)

## Resumo

Criar uma camada de roteamento baseada em overrides configuráveis por contato e organização, sem misturar com "consultor". O sistema resolverá o destino na transferência usando a cadeia: **Atendente preferido → Departamento preferido → Departamento padrão da Organização → Fallback do nó**.

## Etapas

### 1. Migração: Adicionar colunas

**contacts:**
- `preferred_agent_id` (uuid, nullable, FK profiles)
- `preferred_department_id` (uuid, nullable, FK departments)

**organizations:**
- `default_department_id` (uuid, nullable, FK departments)

### 2. Frontend: Novo tipo de transferência `preferred`

**TransferPropertiesPanel.tsx** -- Adicionar opção "Preferência do Contato" no select de tipo, com:
- Select de departamento fallback (obrigatório, igual ao consultant)
- Info box explicando a cadeia de prioridade

**TransferNode.tsx** -- Exibir badge "Preferência do Contato" + fallback dept quando `transfer_type = 'preferred'`

### 3. Frontend: Campos de override no contato

**ContactDetailsSidebar.tsx** (ou formulário de edição do contato) -- Adicionar selects para:
- "Atendente preferido" (busca agentes)
- "Departamento preferido" (busca departamentos)

### 4. Frontend: Campo default_department_id na Organização

**OrganizationDialog.tsx** -- Adicionar select "Departamento padrão" no formulário de criação/edição de organização.

### 5. Backend: buildVariablesContext -- expor variáveis

No `process-chat-flow/index.ts`, dentro de `buildVariablesContext`, adicionar:
- `contact_preferred_agent_id`
- `contact_preferred_department_id`

E buscar `organization.default_department_id` via join quando `contactData.organization_id` existir:
- `org_default_department_id`

### 6. Backend: Resolver transfer_type='preferred' no webhook

No `meta-whatsapp-webhook/index.ts`, quando `flowData.transferType === 'preferred'`:

```text
1. Buscar contact.preferred_agent_id
   → Se existe e agente online → assigned_to = agent, ai_mode = copilot
   → Se existe mas offline → vai pro dept do agente (ou fallback)
2. Senão buscar contact.preferred_department_id
   → Se existe → department = preferred_dept
3. Senão buscar org.default_department_id (via contact.organization_id)
   → Se existe → department = org_default_dept
4. Senão → department = fallback do nó (department_id configurado no canvas)
```

Após definir o departamento, chamar `route-conversation` para distribuir.

### 7. Backend: Resolver no process-chat-flow (auto-avanço)

No `process-chat-flow/index.ts`, quando nó transfer tem `transfer_type = 'preferred'`, retornar os dados resolvidos (departmentId, agentId) para o webhook executar.

## Impacto

- **Zero regressão**: tipos existentes (department, agent, queue, consultant) continuam inalterados
- **Separação clara**: "preferred" é independente de "consultant"
- **Configurável via UI**: admin preenche os overrides no contato/organização, e o Flow usa o nó "Preferência do Contato"

| Arquivo | Tipo de alteração |
|---|---|
| Migração SQL | 3 colunas novas (contacts + organizations) |
| `TransferPropertiesPanel.tsx` | Nova opção no select + UI |
| `TransferNode.tsx` | Badge para tipo preferred |
| `ContactDetailsSidebar.tsx` | 2 selects novos |
| `OrganizationDialog.tsx` | 1 select novo |
| `process-chat-flow/index.ts` | Expor variáveis + resolver preferred |
| `meta-whatsapp-webhook/index.ts` | Lógica de resolução preferred |

