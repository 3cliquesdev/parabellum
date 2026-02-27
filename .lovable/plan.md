

# Busca por protocolo no Relatório Inbox Time

## Diagnóstico

A RPC `get_inbox_time_report` **já busca por protocolo** (short_id = primeiros 8 chars do UUID). Porém, se o usuário digitar com `#` na frente (ex: `#37E8C1C0`), o `#` é enviado junto ao banco e impede o match.

## Solução

**Frontend** — No `InboxTimeReport.tsx`, sanitizar o valor de `search` antes de enviar ao hook: remover o prefixo `#` caso presente. Isso garante que `#37E8C1C0` seja convertido para `37E8C1C0` antes da query.

Alterar no hook `useInboxTimeReport.ts` (ou na página) para fazer `p_search.replace(/^#/, '')` antes de enviar à RPC.

Arquivo: `src/hooks/useInboxTimeReport.ts` — adicionar sanitização do `p_search` removendo `#` inicial.

