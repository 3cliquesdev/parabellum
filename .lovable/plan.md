

# Correção: Mensagens de conversas não atribuídas invisíveis para o time

## Diagnóstico

Analisei o projeto atual e sigo as regras da base de conhecimento.

O problema está na **política RLS de SELECT da tabela `messages`**. Existe uma inconsistência entre as políticas de `conversations` e `messages`:

| Tabela | Agentes podem ver conversas não atribuídas? |
|---|---|
| `conversations` | **SIM** — a policy `canonical_select_conversations` permite ver conversas `assigned_to IS NULL` do mesmo departamento ou sem departamento |
| `messages` | **NÃO** — a policy `role_based_select_messages` só permite `c.assigned_to = auth.uid()` para agentes não-gerentes |

Resultado: o agente vê a conversa na lista, mas ao clicar, **não consegue ler as mensagens** porque o RLS bloqueia o SELECT na tabela `messages`.

## Solução

Atualizar a política `role_based_select_messages` para alinhar com a política de `conversations`, adicionando visibilidade de mensagens para conversas não atribuídas do mesmo departamento (ou sem departamento).

### SQL da migração

```sql
DROP POLICY IF EXISTS "role_based_select_messages" ON messages;

CREATE POLICY "role_based_select_messages" ON messages FOR SELECT
TO authenticated
USING (
  -- Gerentes veem tudo
  is_manager_or_admin(auth.uid())
  OR
  -- Agente vê mensagens das conversas atribuídas a ele
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND c.assigned_to = auth.uid()
  )
  OR
  -- Agente vê mensagens de conversas não atribuídas do mesmo departamento
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND c.status = 'open'
      AND c.assigned_to IS NULL
      AND has_any_role(auth.uid(), ARRAY[
        'sales_rep','support_agent','financial_agent','consultant'
      ]::app_role[])
      AND (
        c.department = (SELECT p.department FROM profiles p WHERE p.id = auth.uid())
        OR c.department IS NULL
      )
  )
);
```

### Também atualizar a policy de UPDATE

A policy `role_based_update_messages` tem o mesmo gap — agentes não conseguem marcar mensagens como lidas (`is_read = true`) em conversas não atribuídas. Mesma correção:

```sql
DROP POLICY IF EXISTS "role_based_update_messages" ON messages;

CREATE POLICY "role_based_update_messages" ON messages FOR UPDATE
TO authenticated
USING (
  is_manager_or_admin(auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id
      AND (
        c.assigned_to = auth.uid()
        OR (
          c.status = 'open'
          AND c.assigned_to IS NULL
          AND has_any_role(auth.uid(), ARRAY[
            'sales_rep','support_agent','financial_agent','consultant'
          ]::app_role[])
          AND (
            c.department = (SELECT p.department FROM profiles p WHERE p.id = auth.uid())
            OR c.department IS NULL
          )
        )
      )
  )
);
```

## Impacto
- **Zero regressão**: gerentes continuam vendo tudo; agentes com conversas atribuídas continuam vendo normalmente
- **Upgrade**: agentes passam a ver o conteúdo das mensagens de conversas não atribuídas (mesmo departamento ou pool global) para decidir se assumem
- **Segurança mantida**: agentes só veem mensagens de conversas que já tinham acesso via `conversations` — alinhamento 1:1 entre as policies
- **Nenhuma alteração de código frontend**: o problema é 100% RLS

## Arquivo modificado
| Arquivo | Mudança |
|---|---|
| Migration SQL | Atualizar policies `role_based_select_messages` e `role_based_update_messages` |

