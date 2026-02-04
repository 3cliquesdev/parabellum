
# ✅ CONCLUÍDO: Correção Definitiva da Busca no Inbox

## Resumo das Mudanças

### 1. `src/hooks/useInboxSearch.tsx` - Refatorado

**Melhorias implementadas:**

- **Detecção automática de UUID**: Se o termo bater com regex de UUID, busca por `conversation_id` ou `contact_id` com match exato (`eq`).

- **Normalização de telefone**: Remove formatação (+55, espaços, parênteses) antes de buscar. Também tenta variação sem código de país.

- **Ordenação corrigida**: Removida ordenação por `status ASC` no banco (que estava invertida alfabeticamente). Agora ordena `last_message_at DESC` no banco e reordena **client-side** com prioridade: `open > pending > closed`.

- **Limite aumentado**: De 100 para 200 resultados para reduzir falsos negativos.

- **Logs de diagnóstico**: Loga o modo de busca (UUID/email/telefone/texto) no console.

### 2. `src/pages/Inbox.tsx` - Ajustado

- Retorna `null` (em vez de `[]`) quando busca ativa mas resultados ainda não carregaram.
- Passa `isLoading` para `ConversationList` incluindo `searchLoading` e `filteredConversations === null`.
- Exibe skeleton durante a busca, evitando sensação de "lista sumiu".

## Critérios de Aceite

- ✅ Admin consegue localizar conversa ativa por: telefone, email, nome e UUID
- ✅ Busca não fica "presa" mostrando só encerradas quando existem abertas
- ✅ Sem regressões nas regras críticas (kill switch, shadow mode, distribuição, CSAT guard)

## Rollback (se necessário)

```bash
# Reverter useInboxSearch para versão anterior via git history
```
