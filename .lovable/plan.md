

# Plano: Corrigir Roteamento de Deals para CS - Novos Clientes

## Diagnóstico

O pipeline "CS - Novos Clientes" está vazio (0 deals) porque o código implementado **nunca é executado** na maioria dos casos.

### Causa Raiz

Existem DOIS fluxos de criação de deals no webhook:

| Fluxo | Situação | Cria Deal Comercial | Cria Deal CS | Problema |
|-------|----------|---------------------|--------------|----------|
| **Fechamento Automático** (linhas 792-852) | Deal existente SEM vendedor | ✅ Atualiza para WON | ❌ NÃO | `return` antes de CS |
| **Novo Cliente** (linhas 1042-1192) | Cliente totalmente novo | ✅ Cria WON | ✅ Cria em CS | OK |

O problema está no **Fluxo de Fechamento Automático**: quando um deal existente é fechado, o código faz `return` (linha 846) antes de chegar na lógica de criação do CS (linha 1143).

### Evidência nos Logs
```
[kiwify-webhook] 💚 PAID - Verificando existência: vinicius_verrone@yahoo.com.br
[kiwify-webhook] 🔍 Buscando deals abertos para: vinicius_verrone@yahoo.com.br
[kiwify-webhook] 🆕 NOVO CLIENTE - Iniciando onboarding: vinicius_verrone@yahoo.com.br
[kiwify-webhook] ✅ Deal orgânico criado e ganho: 0fcce494-bbf6-41ec-98af-743dabc7ff27
```
**Nota:** Não há log "✅ Deal CS - Novos Clientes criado" porque o código retornou antes.

### Dados Confirmados
- **421 deals** com `lead_source = 'kiwify_direto'` nos últimos 7 dias
- **0 deals** com `lead_source = 'kiwify_novo_cliente'`

## Solução Técnica

### 1. Adicionar Criação de CS Deal no Fluxo de Fechamento Automático

**Arquivo:** `supabase/functions/kiwify-webhook/index.ts`

Inserir a lógica de criação do deal CS **antes** do `return` no fluxo de fechamento automático (após linha 843, antes do return na linha 846):

```typescript
// APÓS linha 843: console.log(`[kiwify-webhook] ✅ Deal ${saleType.toLowerCase()} fechado...

// 🆕 CRIAR DEAL EM CS - NOVOS CLIENTES TAMBÉM
// (Para acompanhamento do time de CS)
if (!existingContact || existingContact.status !== 'customer') {
  const { data: csNovosPipeline } = await supabase
    .from('pipelines')
    .select('id')
    .eq('name', 'CS - Novos Clientes')
    .single();

  if (csNovosPipeline) {
    const { data: csFirstStage } = await supabase
      .from('stages')
      .select('id')
      .eq('pipeline_id', csNovosPipeline.id)
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (csFirstStage) {
      const { data: csDeal } = await supabase
        .from('deals')
        .insert({
          title: `CS - ${Customer.full_name}`,
          contact_id: matchingDeal.contact_id,
          pipeline_id: csNovosPipeline.id,
          stage_id: csFirstStage.id,
          status: 'open',
          value: kiwifyValue,
          is_returning_customer: false,
          lead_source: 'kiwify_novo_cliente',
          product_id: product?.id || null,
        })
        .select()
        .single();

      if (csDeal) {
        console.log('[kiwify-webhook] ✅ Deal CS - Novos Clientes criado:', csDeal.id);
      }
    }
  }
}

// return new Response(...) ← linha 846
```

### 2. Também Adicionar no Fluxo de Deal COM Vendedor

Quando um deal COM vendedor é marcado como "pending" (linha 741-791), eventualmente quando ele for marcado como WON, também precisa criar o deal CS.

Isso pode ser feito em um trigger ou na função que marca o deal como ganho.

### 3. Script de Migração para Deals Históricos

Criar deals CS retroativos para os clientes que já compraram mas não têm deal em "CS - Novos Clientes":

```sql
-- Script para criar deals CS retroativos
INSERT INTO deals (
  title, contact_id, pipeline_id, stage_id, 
  status, value, is_returning_customer, lead_source
)
SELECT 
  'CS - ' || c.first_name || ' ' || c.last_name,
  c.id,
  'a7599c3b-2d55-4879-b5eb-303bc8266ea2', -- CS - Novos Clientes
  (SELECT id FROM stages WHERE pipeline_id = 'a7599c3b-2d55-4879-b5eb-303bc8266ea2' ORDER BY position LIMIT 1),
  'open',
  d.value,
  false,
  'migracao_retroativa'
FROM contacts c
JOIN deals d ON d.contact_id = c.id AND d.status = 'won' AND d.is_returning_customer = false
WHERE NOT EXISTS (
  SELECT 1 FROM deals cs 
  WHERE cs.contact_id = c.id 
  AND cs.pipeline_id = 'a7599c3b-2d55-4879-b5eb-303bc8266ea2'
)
GROUP BY c.id, c.first_name, c.last_name, d.value;
```

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/kiwify-webhook/index.ts` | Adicionar criação de deal CS no fluxo de fechamento automático |
| Migração SQL (opcional) | Script para criar deals retroativos |

## Fluxo Final Corrigido

```text
+-------------------+
| Kiwify Webhook    |
+--------+----------+
         |
         v
+--------+----------+      +-----------------------+
| Deal Existente?   |--NO->| NOVO CLIENTE          |
+--------+----------+      | 1. Deal Comercial WON |
         |                 | 2. Deal CS Open       |
         | YES             +-----------------------+
         v
+--------+----------+      +-----------------------+
| Com Vendedor?     |--YES>| Marcar Pending        |
+--------+----------+      | (Valida em 30 min)    |
         |                 +-----------------------+
         | NO
         v
+--------+----------+      +-----------------------+
| Fechar Automático |----->| 1. Update Deal WON    |
+-------------------+      | 2. 🆕 Criar Deal CS   |
                           +-----------------------+
```

## Benefícios

1. **Cobertura completa**: Todos os novos clientes vão para CS - Novos Clientes
2. **Zero regressão**: Fluxo comercial continua funcionando normalmente
3. **Retroatividade opcional**: Script SQL para migrar histórico

## Conformidade com Base de Conhecimento

| Regra | Status |
|-------|--------|
| Preservação do existente | ✅ Fluxos atuais mantidos |
| Upgrade, não downgrade | ✅ Adiciona funcionalidade |
| Zero regressão | ✅ Testável em preview |
| Kill Switch respeitado | N/A (edge function) |

