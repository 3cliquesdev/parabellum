

## Plano: Substituir ConversationListItem.tsx com otimizações de cache de sentiment

Substituir o arquivo `src/components/ConversationListItem.tsx` pelo conteúdo do upload, que inclui 4 otimizações para reduzir chamadas de AI de ~15.000/dia para ~200 por sessão:

1. **Cache global em memória** (`sentimentCache = new Map`)
2. **useState inicializa do cache** — evita useEffect desnecessário
3. **Query desabilitada se cache existe** — não busca mensagens se não vai chamar IA
4. **staleTime 5min + delay cap 30s** — menos queries ao banco

### Ação
- Copiar `user-uploads://ConversationListItem.tsx` → `src/components/ConversationListItem.tsx`

