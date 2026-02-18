

## Correcao: Dashboard de Playbooks Vazio (Erro PGRST203)

### Problema Identificado

O dashboard de "Monitoramento de Playbooks" esta completamente vazio porque **todas as chamadas RPC falham com erro 300 (PGRST203)**. O erro diz:

> "Could not choose the best candidate function between: public.get_playbook_kpis(), public.get_playbook_kpis(p_start, p_end)"

Isso acontece porque existem **duas versoes de cada funcao no banco** (overloading):

- Versao 1 (antiga): `get_playbook_kpis()` — sem parametros
- Versao 2 (nova): `get_playbook_kpis(p_start, p_end)` — com parametros opcionais

O PostgREST nao consegue decidir qual chamar quando o frontend envia `{}` (sem parametros), pois ambas sao candidatas validas. O mesmo problema afeta `get_email_evolution` e `get_playbook_performance`.

### Solucao

**1 migracao SQL** para remover as versoes antigas (sem parametros) das 3 funcoes. As versoes novas com parametros opcionais (`DEFAULT NULL`) ja cobrem o caso sem filtro.

```text
DROP FUNCTION IF EXISTS get_playbook_kpis();
DROP FUNCTION IF EXISTS get_email_evolution(int);
DROP FUNCTION IF EXISTS get_playbook_performance();
```

Isso remove a ambiguidade e o PostgREST passa a usar a unica versao restante.

### Detalhes Tecnicos

- **Arquivo alterado**: Nenhum arquivo de codigo. Apenas uma migracao SQL.
- **Funcoes que ficam** (ja existentes, nao mudam):
  - `get_playbook_kpis(p_start timestamptz DEFAULT NULL, p_end timestamptz DEFAULT NULL)`
  - `get_email_evolution(p_days int DEFAULT 7, p_start timestamptz DEFAULT NULL, p_end timestamptz DEFAULT NULL)`
  - `get_playbook_performance(p_start timestamptz DEFAULT NULL, p_end timestamptz DEFAULT NULL)`
- **Impacto zero** no frontend — o hook `usePlaybookMetrics` ja passa `{}` sem filtro ou `{p_start, p_end}` com filtro, ambos funcionam com a versao unificada.
- Kill Switch, Shadow Mode, CSAT, distribuicao, inbox nao sao afetados.

