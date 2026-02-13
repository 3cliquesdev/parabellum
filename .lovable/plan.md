
# Roteamento Condicional por Resposta — Responsavel dinamico baseado em campo dropdown

## Resumo

Adicionar uma nova regra de distribuicao nos formularios: **"Por resposta do campo"**. Quando selecionada, o admin pode escolher um campo do tipo **select (dropdown)** do formulario e mapear cada opcao a um responsavel diferente. Exemplo:

- "Atendimento Hibrido" → Leticia Aparecida
- "Atendimento Nacional" → Carlos Silva

Ao submeter o formulario, o sistema verifica a resposta do campo e direciona automaticamente para o responsavel mapeado.

## Mudancas

### 1. FormRoutingConfig — Nova regra de distribuicao

**Arquivo: `src/components/forms/FormRoutingConfig.tsx`**

- Adicionar nova opcao de distribuicao: `"field_based"` com label "Por Resposta do Campo" e descricao "Responsavel muda conforme a resposta de um campo"
- Quando selecionado, exibir:
  1. Seletor de campo (filtrado apenas para campos do tipo `select` do formulario)
  2. Para cada opcao do campo selecionado, exibir um seletor de usuario (responsavel)
- Os mapeamentos serao salvos como parte do `routing_settings` no schema do formulario

### 2. Tipos e Interface

**Arquivo: `src/components/forms/FormRoutingConfig.tsx`**

Atualizar tipos:

```
FormDistributionRule = "round_robin" | "manager_only" | "specific_user" | "field_based"

FormRoutingSettings += {
  routing_field_id?: string;           // ID do campo select usado para rotear
  routing_field_mappings?: Record<string, string>;  // { "opcao_valor": "user_id" }
}
```

### 3. Passar campos (fields) para o FormRoutingConfig

**Arquivo: `src/pages/FormBuilderPage.tsx`**

O `FormRoutingConfig` precisa saber quais campos existem no formulario para listar os de tipo `select`. Passar `schema.fields` como prop.

### 4. Edge Function — Logica de roteamento condicional

**Arquivo: `supabase/functions/form-submit-v3/index.ts`**

Na etapa de determinacao de `assignedTo`:

```
if (form.distribution_rule === "field_based") {
  const routingFieldId = form.schema?.settings?.routing_field_id
                      || form.routing_field_id;
  const mappings = form.schema?.settings?.routing_field_mappings
                || form.routing_field_mappings;
  
  if (routingFieldId && mappings) {
    const userAnswer = sanitizedAnswers[routingFieldId];
    assignedTo = mappings[userAnswer] || null;
  }
}
```

Tambem atualizar `supabase/functions/submit-form/index.ts` (v1) com a mesma logica.

### 5. Persistencia dos mapeamentos

Os mapeamentos `routing_field_id` e `routing_field_mappings` serao armazenados dentro do JSON `schema.settings` (ja flexivel), sem necessidade de migration SQL. O edge function ja le `form.schema`.

Alternativa (mais robusto): adicionar colunas `routing_field_id` e `routing_field_mappings` na tabela `forms`. Isso facilita queries e mantém consistencia com `target_user_id`.

**Decisao: usar colunas na tabela `forms`** para manter o padrao existente (target_user_id, distribution_rule sao colunas, nao JSON).

### 6. Migration SQL

```sql
ALTER TABLE forms 
  ADD COLUMN IF NOT EXISTS routing_field_id TEXT,
  ADD COLUMN IF NOT EXISTS routing_field_mappings JSONB DEFAULT '{}';

COMMENT ON COLUMN forms.routing_field_id IS 'ID do campo select usado para roteamento condicional';
COMMENT ON COLUMN forms.routing_field_mappings IS 'Mapeamento opcao->user_id para distribuicao field_based';
```

## Fluxo Visual no Editor

```text
+------------------------------------------+
| Quem assume?                             |
| [v] Por Resposta do Campo                |
+------------------------------------------+
| Campo de roteamento:                     |
| [v] Tipo de Atendimento (select)         |
+------------------------------------------+
| Mapeamento de responsaveis:              |
|                                          |
| "Atendimento Hibrido"                    |
| [v] Leticia Aparecida                    |
|                                          |
| "Atendimento Nacional"                   |
| [v] Carlos Silva                         |
|                                          |
| "Atendimento Regional"                   |
| [v] Selecione...                         |
+------------------------------------------+
```

## Arquivos Modificados

1. **Migration SQL** — Colunas `routing_field_id` e `routing_field_mappings`
2. **`src/components/forms/FormRoutingConfig.tsx`** — Nova regra + UI de mapeamento
3. **`src/pages/FormBuilderPage.tsx`** — Passar `fields` como prop para FormRoutingConfig + salvar novos campos
4. **`supabase/functions/form-submit-v3/index.ts`** — Logica de roteamento field_based
5. **`supabase/functions/submit-form/index.ts`** — Mesma logica (v1)

## Zero Regressao

- As regras existentes (round_robin, manager_only, specific_user) continuam inalteradas
- Novos campos na tabela `forms` sao nullable, nao afetam formularios existentes
- Edge functions so entram no bloco `field_based` quando essa regra e selecionada
- Nenhuma alteracao em CSAT, Kill Switch, fluxos ou distribuicao de conversas
