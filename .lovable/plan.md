

# Ferramenta de Limpeza em Massa de Nomes de Contatos

## Problema
Importações trouxeram texto de produto concatenado no `first_name`/`last_name` dos contatos (ex: "Bege - Jogo de 5 Panelas..." no campo nome).

## Solução
Adicionar um botão "Limpar Nomes de Contatos" no `DataManagementCard` do Super Admin que abre um dialog com preview dos contatos afetados e opção de corrigir em massa.

## Arquivos

### 1. Novo: `src/components/super-admin/ContactNameCleanupDialog.tsx`
- Dialog com 3 etapas:
  1. **Scan**: Busca contatos cujo `first_name` ou `last_name` contém padrões suspeitos (traços ` - `, nomes muito longos > 40 chars, textos com palavras-chave de produto como "Jogo", "Kit", "Panela", "Conjunto", etc.)
  2. **Preview**: Tabela mostrando nome atual vs nome sugerido (limpo). Lógica: pegar texto antes do primeiro ` - ` como nome real, descartar o resto. Permitir edição manual do nome sugerido.
  3. **Aplicar**: Atualiza os contatos selecionados via batch update no Supabase.

- Lógica de detecção:
  - `first_name` ou `last_name` contém ` - ` seguido de texto longo
  - Campo com mais de 40 caracteres
  - Regex para padrões de produto (números + "un", "peças", "jogo", etc.)

- Lógica de limpeza:
  - Extrai texto antes do primeiro ` - ` como nome limpo
  - Trim e capitalize

### 2. Editar: `src/components/super-admin/DataManagementCard.tsx`
- Adicionar botão "Limpar Nomes de Contatos" com ícone `Eraser`
- State para controlar abertura do dialog
- Renderizar `<ContactNameCleanupDialog>`

## Sem migrações
Tudo usa a tabela `contacts` existente com updates diretos via SDK.

