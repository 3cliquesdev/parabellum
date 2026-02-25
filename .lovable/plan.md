

# Plano: Expandir Verificação de Email para Incluir Base Kiwify

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Problema Identificado

A função `verify-customer-email` busca **apenas** contatos com `status = 'customer'` na tabela `contacts`. Porém, existem **986 contatos** que possuem eventos `paid` na Kiwify mas estão com status `lead` ou `churned` — ou seja, são clientes reais que o sistema não reconhece.

Quando um desses clientes fornece o email, o sistema retorna `found: false` e trata como lead novo, quebrando a vinculação e o redirecionamento ao consultor.

## Dados Concretos

| Situação | Quantidade |
|---|---|
| Contatos `customer` com email | 13.309 |
| Contatos com evento `paid` na Kiwify mas status ≠ `customer` | 986 |
| Emails Kiwify sem contato algum | 0 |

## Solução em 2 Partes

### Parte 1: Correção em Massa (Migration SQL)

Atualizar os 986 contatos que têm evento `paid` na `kiwify_events` mas status ≠ `customer` para `status = 'customer'`. Isso resolve o problema na raiz — a base de contatos passa a refletir a realidade da Kiwify.

```sql
UPDATE contacts c
SET status = 'customer', updated_at = now()
FROM (
  SELECT DISTINCT lower(ke.customer_email) as email
  FROM kiwify_events ke
  WHERE ke.event_type = 'paid'
  AND ke.customer_email IS NOT NULL
) k
WHERE lower(c.email) = k.email
AND c.status IN ('lead', 'churned');
```

### Parte 2: Fallback na `verify-customer-email`

Para evitar que isso aconteça novamente no futuro, adicionar um fallback: se o email não for encontrado como `customer` na `contacts`, buscar na `kiwify_events` por evento `paid`. Se encontrado, promover o contato para `customer` automaticamente e retornar `found: true`.

**Fluxo atualizado:**

```text
Email recebido
    │
    ├── Busca em contacts WHERE status='customer'
    │   ├── Encontrou → Retorna found:true (atual)
    │   └── Não encontrou ↓
    │
    ├── Busca em kiwify_events WHERE event_type='paid' AND customer_email = email
    │   ├── Encontrou → Promove contato para 'customer' + Retorna found:true
    │   └── Não encontrou → Retorna found:false (atual)
```

**Alteração em `verify-customer-email/index.ts`** (após linha 71):
- Buscar `kiwify_events` pelo email com `event_type = 'paid'`
- Se encontrar, fazer UPDATE no contato existente para `status = 'customer'`
- Se não existir contato, criar um novo com os dados do payload Kiwify
- Retornar `found: true` com os dados do contato (incluindo `consultant_id`)

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — lógica atual mantida, fallback é adicional |
| Kill Switch | Não afetado — verificação não envia mensagens |
| Fluxo existente | Preservado — só adiciona caminho alternativo |
| CSAT guard | Não afetado |
| Auditoria | Log no console da Edge Function |

## Arquivos

| Arquivo | Mudança |
|---|---|
| Migration SQL | UPDATE em massa dos 986 contatos com `paid` para `customer` |
| `supabase/functions/verify-customer-email/index.ts` | Adicionar fallback de busca na `kiwify_events` |

