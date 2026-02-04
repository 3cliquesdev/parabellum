
# Plano de Emergência: Restaurar Visibilidade do Inbox

## Status Atual: PARCIALMENTE CONCLUÍDO ⚠️

### O que foi feito ✅
1. **Índice user_roles otimizado** - `idx_user_roles_uid_role` criado
2. **RLS inbox_view otimizada** - Política `optimized_admin_manager_inbox` aplicada com EXISTS
3. **Edge Function corrigida** - Import alterado para `https://esm.sh/` e deploy realizado
4. **Frontend aliviado** - Limite reduzido de 5000 para 500, staleTime aumentado para 30s

### Pendente ⏳
1. **RLS conversations** - Bloqueada por deadlock contínuo (processo 1995008 segurando lock)
   - O Realtime está mantendo lock na tabela conversations
   - Tentativa será feita automaticamente quando o banco aliviar

## Diagnóstico Confirmado

### Dados existem - NÃO foram perdidos
| Tabela | Registros |
|--------|-----------|
| conversations | 3.265 |
| inbox_view | 3.188 |
| Abertas | 154 |
| Fechadas | 3.110 |

### Seu perfil está correto
- Email: ronildo@liberty.com
- Role: **admin**
- Deveria ver: **Todas as conversas**

### Causa Raiz: Timeouts em Cascata
Os logs do Postgres mostram **centenas de erros "statement timeout"** por minuto. O problema:

1. Políticas RLS de `inbox_view` e `conversations` usam `has_role(auth.uid(), 'admin')` 
2. Com ~3.200 registros, a função é chamada **3.200 vezes por query**
3. Cada chamada faz uma subquery em `user_roles`
4. Resultado: Query ultrapassa timeout de 8 segundos
5. Frontend recebe dados vazios ou erro

### Por que afeta o Admin?
Mesmo que `admin` seja a primeira condição na política `admin_manager_full_access_inbox_view`, o Postgres ainda precisa avaliar `has_role()` uma vez para confirmar. Quando o banco está sobrecarregado (muitos usuários simultaneamente), até essa única verificação pode sofrer timeout.

## Solução Aplicada

### Fase 1: Otimizar RLS de inbox_view ✅ CONCLUÍDO
```sql
DROP POLICY IF EXISTS "admin_manager_full_access_inbox_view" ON public.inbox_view;

CREATE POLICY "optimized_admin_manager_inbox" ON public.inbox_view
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'general_manager', 'support_manager', 'cs_manager', 'financial_manager')
  )
);
```

### Fase 2: Otimizar RLS de conversations ⏳ PENDENTE (deadlock)
```sql
DROP POLICY IF EXISTS "admin_manager_full_access_conversations" ON public.conversations;

CREATE POLICY "optimized_admin_manager_conv" ON public.conversations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager', 'general_manager', 'support_manager', 'cs_manager', 'financial_manager')
  )
);
```

### Fase 3: Edge Function get-inbox-counts ✅ CONCLUÍDO
- Import corrigido de `npm:` para `https://esm.sh/`
- Usando `Deno.serve` nativo

### Fase 4: Frontend aliviado ✅ CONCLUÍDO
- Limite de inbox reduzido de 5000 para 500
- staleTime aumentado para 30s
- Polling reduzido para 2 minutos
- refetchOnWindowFocus desabilitado temporariamente

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 0 conversas visíveis | ~154 conversas abertas |
| Timeouts constantes | Queries em <500ms |
| "Reconectando..." | Conexão estável |
| Afeta todos os roles | Todos os roles funcionando |

## Próximos Passos

1. Aguardar estabilização do banco (menos deadlocks)
2. Aplicar migração de conversations
3. Restaurar limites originais gradualmente
