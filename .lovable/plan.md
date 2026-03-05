

# Plano: Gerenciar Contatos vinculados a Organizacoes

## Contexto
Atualmente nao existe uma forma visual de ver/adicionar/remover contatos de uma organizacao. O vinculo existe no banco (`contacts.organization_id`), mas so pode ser gerenciado editando cada contato individualmente no `ContactDialog`. O usuario quer gerenciar isso diretamente na tela de Organizacoes.

## Abordagem
Ao clicar no card de uma organizacao (ou num botao "Ver contatos"), abrir um **Dialog/Sheet** que mostra os contatos vinculados e permite adicionar/remover.

## Alteracoes

### 1. Novo componente `OrganizationContactsDialog.tsx`
- Dialog com lista dos contatos vinculados (query: `contacts where organization_id = org.id`)
- Cada contato mostra: nome, telefone, email, botao "Remover" (seta `organization_id = null`)
- Secao "Adicionar contato": Select/Combobox buscando contatos que **nao** pertencem a essa org, com botao "Adicionar" (seta `organization_id = org.id`)
- Usa mutations simples de update na tabela `contacts`

### 2. Hook `useOrganizationContacts(orgId)`
- Query: `supabase.from('contacts').select('id, first_name, last_name, phone, email').eq('organization_id', orgId)`
- Mutations: `addContactToOrg(contactId, orgId)` e `removeContactFromOrg(contactId)` — ambos sao `update` no campo `organization_id`

### 3. Atualizar `Organizations.tsx`
- Tornar o card clicavel ou adicionar botao "Contatos" no card
- Ao clicar, abre o `OrganizationContactsDialog` passando o `org.id`

### 4. Zero mudancas no banco
- A relacao `contacts.organization_id → organizations.id` ja existe
- Nenhuma migration necessaria

