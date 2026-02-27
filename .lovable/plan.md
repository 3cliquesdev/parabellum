

# Fix: Relatório Inbox Time não carrega dados

## Diagnóstico

A RPC `get_inbox_time_report` **funciona corretamente** quando executada diretamente no banco — retorna 432 conversas para o período, com todos os KPIs calculados.

O problema é que o PostgREST (camada que conecta o frontend ao banco) **não recarregou o cache do schema** após as migrations anteriores que recriaram a função. Ele ainda tenta usar a assinatura antiga da RPC, que falhava com type mismatch — resultando em erro silencioso no frontend.

## Plano (2 passos)

### 1. Migration: Forçar reload do schema cache do PostgREST

Criar migration com `NOTIFY pgrst, 'reload schema'` para forçar o PostgREST a reconhecer a função atualizada. Também recriar a função novamente para garantir que está atualizada.

### 2. Frontend: Mostrar erro explícito quando RPC falhar

No `InboxTimeReport.tsx` e nos componentes `InboxTimeKPICards` / `InboxTimeTable`, propagar `isError` e `error` do hook para exibir mensagem de erro visível em vez de simplesmente mostrar "Nenhuma conversa encontrada" quando na verdade houve falha na chamada.

