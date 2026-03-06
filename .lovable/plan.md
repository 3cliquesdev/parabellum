

# Fix: Permissões não refletem em tempo real para outros usuários

## Diagnóstico

As permissões estão **salvas corretamente** no banco (17 ativas para `support_agent`). O problema é cache no navegador do atendente:

1. `useRolePermissions` tem `staleTime: 60s` — dentro desse intervalo, nem `refetchOnWindowFocus` força refetch
2. O realtime (`useRealtimePermissions`) DEVERIA invalidar o cache, mas pode falhar se a conexão WebSocket caiu ou se o filtro `role=eq.${role}` não está batendo corretamente
3. Não existe feedback visual para o atendente saber que precisa atualizar

## Mudanças

### 1. `src/hooks/useRolePermissions.tsx`
- Reduzir `staleTime` de 60s para **10s** — permissões são críticas, devem ser frescas
- Mudar `refetchOnWindowFocus` para `"always"` (ignora staleTime no focus)

### 2. `src/hooks/useRealtimePermissions.tsx`
- Remover o filtro `filter: role=eq.${role}` — escutar TODAS as mudanças em `role_permissions` e invalidar só quando `payload.new.role === role` ou `payload.old.role === role`
- Isso garante que mudanças feitas pelo admin sejam captadas mesmo se o filtro do Postgres Realtime tiver edge cases

### 3. `src/components/AppSidebar.tsx`
- Adicionar um botão sutil de "recarregar permissões" no rodapé do sidebar (ícone refresh) para fallback manual

## Impacto
- Zero regressão — apenas cache mais agressivo e realtime mais robusto
- Admin continua com fullAccess (bypass total)
- Atendente verá mudanças em ~10s ou ao focar a janela

