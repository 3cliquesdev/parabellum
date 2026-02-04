

## Diagnóstico: Problemas identificados no Inbox para Miguel Fedes

Analisei o projeto atual e sigo as regras da base de conhecimento.

### Resumo Executivo

Identifiquei **dois problemas distintos** que estão interconectados:

---

### Problema 1: Mensagens aparecem e desaparecem

**Causa raiz:** A política RLS para INSERT na tabela `messages` exige que a conversa esteja atribuída ao usuário que envia a mensagem.

**O que acontece:**
1. Miguel visualiza a conversa `59b8dcbc-e21b-48ba-bb56-ff5a2b3d25f0`
2. Esta conversa está atribuída a **Ronildo Oliveira**, não ao Miguel
3. Miguel tenta enviar uma mensagem
4. O hook `sendInstant` adiciona a mensagem ao cache (ela **aparece** instantaneamente)
5. Em background, o INSERT no banco **falha** com erro RLS: `"new row violates row-level security policy for table 'messages'"`
6. O hook detecta a falha e marca a mensagem como `failed` ou remove do cache (ela **desaparece**)

**Evidência nos logs:**
```
ERROR: new row violates row-level security policy for table "messages"
```

**Política atual de INSERT em messages:**
```sql
CREATE POLICY role_based_insert_messages ON messages
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager') 
  OR EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id 
    AND c.assigned_to = auth.uid()  -- ❌ Problema: exige atribuição
  )
)
```

---

### Problema 2: Tags não funcionam em alguns casos

**Causa raiz:** O mesmo cenário - Miguel tenta adicionar tags em conversas que não estão atribuídas a ele.

A política de tags em si está OK (`authenticated_can_manage_conversation_tags` permite qualquer autenticado), mas o **problema de visibilidade** é que Miguel pode VER conversas do mesmo departamento mas não pode INTERAGIR com elas (enviar mensagens ou possivelmente tags em alguns edge cases).

---

### Por que Miguel consegue VER a conversa?

O filtro de inbox (`useInboxView.tsx`) permite que agentes vejam:
- Conversas atribuídas a eles
- Conversas não atribuídas do mesmo departamento
- **Conversas atribuídas a colegas do mesmo departamento** (para visibilidade)

Porém, a política RLS de INSERT em `messages` não foi atualizada para acompanhar essa visibilidade.

---

## Solução Proposta

### Fase 1: Atualizar política RLS para INSERT em messages

Permitir que agentes do mesmo departamento possam enviar mensagens em conversas do departamento, mesmo que atribuídas a outro agente. Isso é útil para:
- Colaboração entre agentes
- Assumir conversas de colegas ausentes
- Notas internas entre equipe

**Nova política:**
```sql
CREATE POLICY role_based_insert_messages ON messages
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager')
  OR has_role(auth.uid(), 'support_manager')
  OR has_role(auth.uid(), 'cs_manager')
  OR EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id 
    AND (
      c.assigned_to = auth.uid()                    -- Atribuída ao usuário
      OR c.assigned_to IS NULL                       -- Não atribuída (pool)
      OR c.department = (                            -- Mesmo departamento
        SELECT department FROM profiles WHERE id = auth.uid()
      )
    )
  )
)
```

---

### Fase 2: Melhorar feedback visual de falhas

Atualmente, quando uma mensagem falha por RLS, ela simplesmente "desaparece". Vou garantir que:
1. A mensagem permaneça visível com status `failed`
2. Um toast de erro apareça explicando o problema
3. O usuário receba orientação sobre como resolver (ex: "Assuma a conversa primeiro")

---

### Detalhes Técnicos da Implementação

| Componente | Mudança |
|------------|---------|
| **Migration SQL** | Atualizar política `role_based_insert_messages` para incluir check de departamento |
| **useSendMessageInstant.tsx** | Melhorar mensagem de erro quando falha por RLS, mantendo mensagem no cache como `failed` |
| **SuperComposer.tsx** | Adicionar check proativo se usuário pode enviar antes de tentar |

---

### Impacto e Mitigação

| Impacto | Mitigação |
|---------|-----------|
| Agentes podem enviar em conversas de colegas do departamento | ✅ Isso é desejado para colaboração |
| Não afeta conversas de outros departamentos | ✅ Mantém isolamento entre departamentos |
| Retrocompatível com comportamento atual | ✅ Apenas EXPANDE permissões, não remove |

---

### Rollback

Se necessário reverter:
```sql
-- Basta restaurar a política anterior
DROP POLICY role_based_insert_messages ON messages;
CREATE POLICY role_based_insert_messages ON messages
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') 
  OR has_role(auth.uid(), 'manager') 
  OR EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = messages.conversation_id 
    AND c.assigned_to = auth.uid()
  )
);
```

