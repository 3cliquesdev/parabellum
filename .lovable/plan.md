

# Fix: RPC `get_support_dashboard_counts` quebrada - coluna inexistente

## Causa Raiz

A ultima migration (`20260227133023`) referencia a coluna `sla_deadline` na tabela `tickets`, mas essa coluna **nao existe**. O nome correto e `due_date`. Isso faz a RPC inteira crashar com erro SQL, retornando erro para todos os 4 KPIs. O frontend trata o erro como fallback silencioso = mostra 0, 0, 0.

Confirmei executando a RPC diretamente no banco:
```
ERROR: 42703: column "sla_deadline" does not exist
```

## Plano (2 passos)

### 1. Migration: Corrigir RPC (trocar `sla_deadline` por `due_date`)

Recriar `get_support_dashboard_counts` identica a atual, apenas corrigindo `sla_deadline` -> `due_date` na query de SLA risk.

### 2. Frontend: Mostrar erro explicito nos KPIs quando RPC falhar

No `SupportDashboardTab.tsx` e `OverviewDashboardTab.tsx`, tratar o estado `isError` dos hooks para exibir indicador visual em vez de zeros enganosos.

## Impacto

- Zero risco de regressao: apenas corrige nome de coluna errado
- Ambas as telas (Dashboard aba Suporte + Visao Geral) serao corrigidas
- Nenhum widget existente e alterado alem do tratamento de erro

