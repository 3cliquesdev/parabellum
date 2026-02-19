

## Correcao: Notificacoes Redirecionam ao Clicar

### Problema
Ao clicar numa notificacao no sino, nada acontece para alguns tipos (como "Nova oportunidade de aprendizado"). Isso ocorre porque:

1. O tipo `passive_learning_pending` nao esta no switch de `getNotificationTarget` no `NotificationBell.tsx`
2. A notificacao criada pelo trigger do banco nao inclui `action_url` no metadata
3. Notificacoes de ticket ja funcionam (tem `action_url` no metadata), mas o tipo `passive_learning_pending` nao tem rota definida

### Solucao (2 partes)

**1. `src/components/NotificationBell.tsx` -- Adicionar tipos faltantes ao switch**

Adicionar `passive_learning_pending` ao switch de `getNotificationTarget` para redirecionar para a pagina de curadoria/auditoria de IA:

```text
case 'passive_learning_pending':
case 'knowledge_approval':
case 'ai_learning':
  return '/settings/ai-audit';
```

Tambem adicionar icone adequado para `passive_learning_pending` no switch de `getIcon`.

**2. Trigger do banco -- Incluir `action_url` no metadata**

Atualizar a funcao `trigger_passive_learning()` para incluir `action_url: '/settings/ai-audit'` no JSON do metadata, garantindo que notificacoes futuras tenham a URL de destino diretamente. Isso segue o padrao universal ja usado pelas outras notificacoes.

### Detalhes Tecnicos

**Arquivo: `src/components/NotificationBell.tsx`**

No `getNotificationTarget`:
- Adicionar case `passive_learning_pending` junto com `knowledge_approval` e `ai_learning` apontando para `/settings/ai-audit`

No `getIcon`:
- Adicionar case `passive_learning_pending` com icone de Info/primary

**Migracao SQL:**
```sql
CREATE OR REPLACE FUNCTION public.trigger_passive_learning()
-- Mesma logica, mas metadata inclui:
-- 'action_url', '/settings/ai-audit'
```

### Impactos
- Sem downgrade: notificacoes de ticket e deals ja funcionam e continuam iguais
- Upgrade: clicar em qualquer notificacao agora redireciona para a pagina correta
- Notificacoes existentes sem `action_url` serao tratadas pelo fallback do switch por tipo

