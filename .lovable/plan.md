

# Correção das 4 Conversas Pendentes

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Conversas Identificadas

| Contato | Conversa ID | Consultor ID |
|---|---|---|
| Helen Pereira | `725c1297-...` | `0d0b0a9c-...` |
| Jorge Luiz Ribeiro | `945fe70e-...` | `d76a5406-...` |
| Virginia de Oliveira Monteiro | `b13845a8-...` | `dc6d6f88-...` |
| Emerson Smanioto | `da4f0ab4-...` | `dc6d6f88-...` |

Todas estão com `status = 'open'`, `assigned_to = NULL`, `ai_mode = 'autopilot'`.

## Ação

Executar um único UPDATE via migration (data fix) que:

1. Atribui `assigned_to = consultant_id` do contato
2. Muda `ai_mode` de `autopilot` para `copilot`
3. Registra log em `interactions` para auditoria

### SQL a executar

```sql
-- Fix: Atribuir as 4 conversas pendentes ao consultor do contato
UPDATE conversations c
SET 
  assigned_to = cont.consultant_id,
  ai_mode = 'copilot',
  updated_at = now()
FROM contacts cont
WHERE c.contact_id = cont.id
  AND c.status = 'open'
  AND c.assigned_to IS NULL
  AND cont.consultant_id IS NOT NULL;

-- Auditoria: registrar a correção
INSERT INTO interactions (conversation_id, type, content)
SELECT c.id, 'note', 'Conversa atribuída manualmente ao consultor do contato (correção pontual de dados pré-trigger)'
FROM conversations c
JOIN contacts cont ON cont.id = c.contact_id
WHERE c.assigned_to = cont.consultant_id
  AND c.ai_mode = 'copilot'
  AND c.id IN (
    '725c1297-e03b-4df5-870a-61c6196e20a8',
    '945fe70e-add1-4238-9f6a-7a54b90fe6c2',
    'b13845a8-9c17-4724-824a-46ad089a3f95',
    'da4f0ab4-f1d0-4f87-a4cb-aea2cc5abb32'
  );
```

## Impacto

- **Zero regressão**: Apenas 4 conversas específicas são afetadas
- **Trigger ativo**: Futuras atualizações de `consultant_id` serão tratadas automaticamente pelo trigger já implementado
- **Auditoria**: Log registrado em `interactions`

## Arquivo

| Tipo | Mudança |
|---|---|
| Migration SQL (data fix) | UPDATE + INSERT para as 4 conversas pendentes |

