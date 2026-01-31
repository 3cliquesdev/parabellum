
# Plano: Roteamento Automático para Funis de CS

## Contexto e Objetivo

O sistema precisa criar automaticamente deals nos pipelines de Customer Success (CS) quando:

1. **CS - Novos Clientes** (`a7599c3b-2d55-4879-b5eb-303bc8266ea2`): Toda venda ganha de cliente novo (primeira compra)
2. **CS - Recorrência** (`468a3d8c-fffc-44a5-a7b8-f788906dd492`): Toda renovação de assinatura de cliente existente

## Situação Atual

| Pipeline | Deals | Problema |
|----------|-------|----------|
| CS - Recorrência | 2198 | Parcialmente funcional (nome errado no código) |
| CS - Novos Clientes | 0 | Nunca recebe deals |

### Problemas Identificados

1. O código busca `'Pipeline de Recorrência'` mas o pipeline real é `'CS - Recorrência'`
2. Novos clientes criam deal no pipeline padrão, mas NÃO criam no `CS - Novos Clientes`
3. `handleSubscriptionRenewal` (renovação) apenas atualiza LTV, não cria deal no CS

## Arquitetura da Solução

```text
+-------------------+
| Kiwify Webhook    |
+--------+----------+
         |
         v
+--------+----------+     +-----------------------+
| handlePaidOrder   | --> | 1. Pipeline Comercial |
| (is_returning=F)  |     | 2. CS - Novos Clientes|
+--------+----------+     +-----------------------+
         |
         v
+--------+----------+     +-----------------------+
| handleUpsellOrder | --> | 1. CS - Recorrência   |
| (is_returning=T)  |     +-----------------------+
+--------+----------+
         |
         v
+--------+--------------+  +-----------------------+
| handleSubscription    |  | 1. CS - Recorrência   |
| Renewal               |->| (criar deal novo)     |
+--------+--------------+  +-----------------------+
```

## Mudanças Técnicas

### 1. Modificar `handlePaidOrder` (Novo Cliente)

**Arquivo:** `supabase/functions/kiwify-webhook/index.ts`

Após criar o deal no pipeline padrão (comercial), criar um segundo deal no pipeline `CS - Novos Clientes` na primeira stage (Onboarding):

```typescript
// APÓS criar deal no pipeline padrão...

// 🆕 CRIAR DEAL EM CS - NOVOS CLIENTES
const { data: csNovosPipeline } = await supabase
  .from('pipelines')
  .select('id')
  .eq('name', 'CS - Novos Clientes')
  .single();

if (csNovosPipeline) {
  // Buscar primeira stage (Onboarding)
  const { data: firstStage } = await supabase
    .from('stages')
    .select('id')
    .eq('pipeline_id', csNovosPipeline.id)
    .order('position', { ascending: true })
    .limit(1)
    .single();

  if (firstStage) {
    await supabase.from('deals').insert({
      title: `CS - ${Customer.full_name}`,
      contact_id: contact.id,
      pipeline_id: csNovosPipeline.id,
      stage_id: firstStage.id,
      status: 'open', // Aberto para CS acompanhar
      value: netValue,
      is_returning_customer: false,
      lead_source: 'kiwify_novo_cliente',
      product_id: product?.id,
    });
    console.log('[kiwify-webhook] ✅ Deal CS - Novos Clientes criado');
  }
}
```

### 2. Corrigir `handleUpsellOrder` (Cliente Recorrente)

**Arquivo:** `supabase/functions/kiwify-webhook/index.ts`

Corrigir o nome do pipeline de `'Pipeline de Recorrência'` para `'CS - Recorrência'`:

```typescript
// ANTES:
const { data: recurrencePipeline } = await supabase
  .from('pipelines')
  .select('id')
  .eq('name', 'Pipeline de Recorrência') // ❌ Nome errado
  .single();

// DEPOIS:
const { data: recurrencePipeline } = await supabase
  .from('pipelines')
  .select('id')
  .eq('name', 'CS - Recorrência') // ✅ Nome correto
  .single();
```

### 3. Modificar `handleSubscriptionRenewal` (Renovação)

**Arquivo:** `supabase/functions/kiwify-webhook/index.ts`

Adicionar criação de deal em `CS - Recorrência` quando há renovação:

```typescript
// APÓS atualizar LTV do contato...

// 🆕 CRIAR DEAL EM CS - RECORRÊNCIA
const { data: recurrencePipeline } = await supabase
  .from('pipelines')
  .select('id')
  .eq('name', 'CS - Recorrência')
  .single();

if (recurrencePipeline) {
  const { data: wonStage } = await supabase
    .from('stages')
    .select('id')
    .eq('pipeline_id', recurrencePipeline.id)
    .eq('name', 'Ganho')
    .single();

  if (wonStage) {
    await supabase.from('deals').insert({
      title: `Renovação - ${Product.product_name}`,
      contact_id: contact.id,
      pipeline_id: recurrencePipeline.id,
      stage_id: wonStage.id,
      status: 'won',
      value: renewalValue,
      is_returning_customer: true,
      is_organic_sale: true, // Renovação automática
      lead_source: 'kiwify_renovacao',
      closed_at: new Date().toISOString(),
    });
  }
}
```

## Arquivos Afetados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/kiwify-webhook/index.ts` | Adicionar lógica para CS - Novos Clientes, corrigir nome do pipeline de recorrência, criar deal na renovação |

## Fluxo Final

| Evento Kiwify | Cliente | Pipeline Comercial | CS - Novos Clientes | CS - Recorrência |
|---------------|---------|-------------------|---------------------|------------------|
| paid/order_approved | Novo | ✅ Deal Won | ✅ Deal Open (Onboarding) | - |
| paid/order_approved | Existente | - | - | ✅ Deal Won |
| subscription_renewed | Existente | - | - | ✅ Deal Won |

## Benefícios

1. **Visibilidade do CS**: Time de CS vê todos os novos clientes no pipeline "CS - Novos Clientes"
2. **Acompanhamento de Recorrência**: Toda renovação registrada em "CS - Recorrência"
3. **Métricas separadas**: Comercial vs CS têm pipelines distintos para medir performance
4. **Zero regressão**: Fluxo comercial continua funcionando normalmente

## Conformidade com Base de Conhecimento

| Regra | Status |
|-------|--------|
| Preservação do existente | ✅ Pipeline comercial mantido |
| Upgrade, não downgrade | ✅ Adiciona funcionalidade sem remover |
| Zero regressão | ✅ Fluxos existentes preservados |
| Kill Switch respeitado | N/A (edge function) |
