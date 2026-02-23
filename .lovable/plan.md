

# Corrigir conflito de overload na RPC `get_tickets_export_report`

## Problema

A migration anterior adicionou uma nova versao da funcao `get_tickets_export_report` com parametro `p_agent_ids uuid[]`, mas a versao antiga com `p_agent_id uuid` continua existindo. O PostgREST retorna erro HTTP 300 (ambiguidade) ao tentar chamar a funcao:

```
Could not choose the best candidate function between:
  public.get_tickets_export_report(..., p_agent_id => uuid, ...)
  public.get_tickets_export_report(..., p_agent_ids => uuid[], ...)
```

## Solucao

Uma unica migration SQL para dropar a versao antiga da funcao (a com `p_agent_id uuid`).

```sql
DROP FUNCTION IF EXISTS public.get_tickets_export_report(
  timestamp with time zone,
  timestamp with time zone,
  uuid,
  uuid,    -- p_agent_id (versao antiga)
  text,
  text,
  text,
  integer,
  integer
);
```

## Impacto

- **Zero alteracao de codigo** - o frontend ja usa `p_agent_ids` (array)
- **Zero regressao** - a versao nova da funcao permanece intacta
- **Correcao imediata** - o PostgREST volta a resolver a funcao corretamente

