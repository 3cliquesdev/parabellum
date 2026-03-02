

# Atualizar consultor de clientes via planilha (email + consultor)

Analisei o projeto atual e sigo as regras da base de conhecimento.

## O que será feito

Adicionar suporte ao campo "Consultor" no fluxo de importação existente (`/import-clients`), para que você possa subir uma planilha simples com **email** e **consultor**, e o sistema resolva automaticamente o nome do consultor para o `consultant_id` (UUID) correto.

## Mudanças

### 1. Frontend — Auto-mapping + campo no ColumnMapper
**Arquivos**: `src/pages/ImportClients.tsx`, `src/components/ColumnMapper.tsx`

- Adicionar alias `'assigned_to': ['consultor', 'consultant', 'responsavel', 'responsável', 'assigned_to']` no mapeamento automático
- Adicionar campo "Consultor" na lista `DB_FIELDS` do ColumnMapper
- Incluir coluna `consultor` no template CSV de download

### 2. Edge Function — Resolver nome → consultant_id
**Arquivo**: `supabase/functions/bulk-import-contacts/index.ts`

- No início do processamento, buscar todos os consultores ativos (profiles com role `consultant`)
- Quando `assigned_to` vier preenchido, fazer match case-insensitive (trim) contra a lista de nomes
- Se encontrar: setar `consultant_id` no update/insert do contato
- Se não encontrar: registrar warning no log, não bloqueia importação

### Sem risco de regressão
- Contatos sem coluna consultor continuam importando normalmente
- O campo `assigned_to` já existe no fluxo — apenas adicionamos resolução inteligente para `consultant_id`
- Match por nome é tolerante (case-insensitive, trim)

