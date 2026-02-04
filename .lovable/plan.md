
# Plano de Emergência: Restaurar Visibilidade do Inbox

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

## Solução: Otimização das Políticas RLS

### Fase 1: Otimizar RLS de inbox_view (Crítico)
Substituir políticas que usam `has_role()` por `EXISTS` com subquery única:

```sql
-- Remover política atual
DROP POLICY IF EXISTS "admin_manager_full_access_inbox_view" ON public.inbox_view;

-- Criar política otimizada
CREATE POLICY "optimized_admin_manager_inbox" ON public.inbox_view
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);
```

### Fase 2: Otimizar RLS de conversations (Crítico)
Mesma estratégia para a tabela conversations:

```sql
-- Remover política atual
DROP POLICY IF EXISTS "admin_manager_full_access_conversations" ON public.conversations;

-- Criar política otimizada
CREATE POLICY "optimized_admin_manager_conv" ON public.conversations
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);
```

### Fase 3: Corrigir Edge Function get-inbox-counts
Atualizar import para evitar BOOT_ERROR:

```typescript
// Mudar de:
import { createClient } from "npm:@supabase/supabase-js@2";

// Para:
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

## Arquivos a Modificar

| Tipo | Descrição |
|------|-----------|
| Migração SQL | Substituir políticas RLS de inbox_view e conversations |
| Edge Function | Corrigir import em get-inbox-counts |

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| 0 conversas visíveis | ~154 conversas abertas |
| Timeouts constantes | Queries em <500ms |
| "Reconectando..." | Conexão estável |
| Afeta todos os roles | Todos os roles funcionando |

## Por que isso resolve?

A diferença entre `has_role(auth.uid(), 'admin')` e `EXISTS (SELECT 1 FROM user_roles WHERE ...)` é sutil mas crítica:

1. **has_role()**: Postgres chama a função para cada row porque ela é declarada como retornando valor que pode depender da row
2. **EXISTS com subquery**: Postgres otimiza para executar UMA vez no início da query e usar o resultado booleano como filtro constante

Isso reduz de ~3.200 chamadas para **1 chamada** por query.

## Impacto em Outros Roles

Esta mudança beneficia TODOS os usuários:
- Admin/Manager: Query instantânea
- Sales_rep: Menos contenção no banco
- Support_agent: Menos timeouts
- Consultant: Acesso mais rápido

## Rollback

Se algo der errado, podemos recriar as políticas originais com:

```sql
CREATE POLICY "admin_manager_full_access_inbox_view" ON public.inbox_view
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
```
