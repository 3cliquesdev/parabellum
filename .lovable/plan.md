

# Adicionar opção de Remover Cliente do Consultor

## Contexto
Atualmente o `ConsultantClientsSheet` permite apenas **transferir** clientes entre consultores. O usuário quer poder **remover** o vínculo (setar `consultant_id = NULL`), disponível apenas para admins e gerentes.

## Mudanças

### 1. UI — Botão "Remover do consultor" no `ConsultantClientsSheet`
- Adicionar um terceiro modo de ação além de "transferir" e "round-robin": **Remover vínculo**
- Quando clientes estão selecionados, mostrar botão "Desvincular" que seta `consultant_id = NULL` nos contatos selecionados
- Botão visível apenas para roles com full access (admin, manager, general_manager, support_manager, cs_manager, financial_manager)
- Usar `useUserRole()` + `hasFullAccess()` para controlar visibilidade

### 2. Mutation de remoção no `ConsultantClientsSheet`
- Nova mutation que faz `UPDATE contacts SET consultant_id = NULL WHERE id IN (selectedIds)`
- Registra interação no histórico: "Consultor removido por [admin/gerente]"
- Invalida queries relacionadas

### 3. Também na busca por email (página Consultants)
- Quando o resultado mostra um contato com consultor, adicionar botão "Remover" ao lado de "Ver clientes"
- Mesmo controle de acesso (full access only)

### 4. RLS — Nenhuma mudança necessária
- O update em `contacts` já é permitido por roles com full access via policies existentes. A operação é apenas setar `consultant_id = NULL`, que já está coberto pelas policies de UPDATE na tabela contacts.

## Detalhes técnicos
- Arquivos editados: `src/components/contacts/ConsultantClientsSheet.tsx`, `src/pages/Consultants.tsx`
- Imports adicionados: `useUserRole` + `hasFullAccess` de `src/config/roles.ts`
- Ícone: `UserMinus` do lucide-react para o botão de remoção

