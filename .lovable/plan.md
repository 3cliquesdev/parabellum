
## Gerenciamento de Macros direto pelo Inbox

### Problema
Agentes de atendimento (support_agent, financial_agent, consultant) tem a permissao `inbox.access` mas NAO tem `settings.view`. Isso significa que eles conseguem usar macros no chat (via botao Zap ou /atalho), mas nao conseguem criar, editar ou excluir macros porque o unico caminho e Configuracoes, que esta bloqueado.

### Solucao
Expandir o `MacrosPopover` ja existente no composer do Inbox para incluir opcoes de gerenciamento (criar, editar, excluir) diretamente ali, sem precisar navegar para Configuracoes.

### Alteracoes

**1. `src/components/MacrosPopover.tsx`** — Adicionar botoes de gerenciamento

- Adicionar botao "Nova Macro" no topo do popover (ao lado da busca)
- Em cada macro listada, adicionar icones de editar e excluir (visíveis no hover)
- Integrar o `MacroDialog` existente para criar/editar macros inline
- Adicionar AlertDialog de confirmacao para exclusao (mesmo padrao da pagina Macros)
- Importar hooks `useCreateCannedResponse`, `useUpdateCannedResponse`, `useDeleteCannedResponse`

**2. Layout do popover atualizado**

```text
+----------------------------------+
| [Buscar macro...]    [+ Nova]    |
+----------------------------------+
| /ola - Saudacao inicial   [E][X] |
| /preco - Tabela de precos  [E][X]|
| /tchau - Despedida         [E][X]|
+----------------------------------+
| \ ou Ctrl+M para macros         |
+----------------------------------+
```

- Clicar na macro: insere o conteudo (comportamento atual, inalterado)
- Clicar no icone de editar (E): abre MacroDialog para edicao
- Clicar no icone de excluir (X): abre confirmacao e exclui
- Clicar em "+ Nova": abre MacroDialog vazio para criar

### O que NAO muda
- Pagina /settings/macros continua existindo para managers/admins
- Fluxo de selecao de macros (clicar para inserir) inalterado
- SlashCommandMenu (/) continua funcionando normalmente
- Kill Switch, Shadow Mode, CSAT, distribuicao: nao afetados
- Nenhuma alteracao de banco de dados ou permissoes necessaria

### Detalhes Tecnicos

O `MacroDialog` existente ja suporta tanto criacao quanto edicao (recebe `macro` opcional como prop). Basta reutiliza-lo dentro do popover. Os hooks de CRUD (`useCreateCannedResponse`, `useUpdateCannedResponse`, `useDeleteCannedResponse`) ja estao implementados em `useCannedResponses.tsx`.
