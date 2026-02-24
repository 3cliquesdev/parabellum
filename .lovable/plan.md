
# Corrigir job_title dos Consultores

## Problema
Vários usuários com role `consultant` estão com o campo `job_title` preenchido como "Vendedor" na tabela `profiles`, causando exibição incorreta em toda a interface (inbox, transferências, listagens).

## Usuários afetados

| Nome | Role (correto) | job_title atual (errado) | job_title correto |
|------|----------------|--------------------------|-------------------|
| Danielle Martins | consultant | Vendedor | Consultor |
| Oliveira | consultant | Vendedor | Consultor |
| Paulo Lopes | consultant | Vendedor | Consultor |
| Raphaela Arruda | consultant | Vendedor | Consultor |
| Ronildo | consultant | Vendedor | Consultor |
| TESTE | consultant | Vendedor | Consultor |

Luiz Henrique ja esta correto (job_title = "Consultor").

## Solucao

Executar um UPDATE na tabela `profiles` para corrigir o `job_title` de todos os usuarios que possuem role `consultant` na tabela `user_roles` mas estao com job_title diferente de "Consultor".

```text
UPDATE profiles
SET job_title = 'Consultor'
WHERE id IN (
  SELECT user_id FROM user_roles WHERE role = 'consultant'
)
AND (job_title IS DISTINCT FROM 'Consultor');
```

## Impacto
- Correcao apenas de dados, nenhum codigo alterado
- Todas as telas que exibem job_title (inbox, transferencias, listagem de agentes) passam a mostrar "Consultor" corretamente
- Zero regressao: nenhuma logica de negocio depende do valor textual de job_title para roteamento (o roteamento usa o campo `role` da tabela `user_roles`)
