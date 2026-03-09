

# Breakdown de "Vendas Novas" — Quem Vendeu? Orgânico vs Afiliado vs Comercial

## Problema

"Vendas novas: 61 (R$ 3.0k)" — mas quem vendeu? Se 50 são de afiliados, estamos dependentes. Precisamos saber a origem de cada venda nova para tomar decisões.

## Solução

Sub-classificar `newSalesDeals` (já disponível na linha 246) usando os campos que já existem: `affiliate_name`, `is_organic_sale`, `assigned_to`. Adicionar breakdown no WhatsApp, Email e Prompt da IA.

## Mudanças — `supabase/functions/ai-governor/index.ts`

### 1. Após a separação novas/recorrências (linha ~251), adicionar sub-classificação das vendas novas:

```typescript
// Sub-classificar vendas novas: quem vendeu?
const newSalesOrganic = newSalesDeals.filter((d: any) => !d.assigned_to && !d.affiliate_name);
const newSalesAffiliate = newSalesDeals.filter((d: any) => !d.assigned_to && d.affiliate_name);
const newSalesComercial = newSalesDeals.filter((d: any) => !!d.assigned_to);

// Top afiliados nas vendas novas
const affNewMap: Record<string, { deals: number; revenue: number }> = {};
newSalesAffiliate.forEach((d: any) => {
  const name = d.affiliate_name || 'Desconhecido';
  if (!affNewMap[name]) affNewMap[name] = { deals: 0, revenue: 0 };
  affNewMap[name].deals++;
  affNewMap[name].revenue += Number(d.gross_value) || 0;
});
const topNewAffiliates = Object.entries(affNewMap)
  .map(([name, v]) => ({ name, ...v }))
  .sort((a, b) => b.deals - a.deals)
  .slice(0, 5);
```

Retornar no objeto (linha ~486): `newSalesOrganicCount`, `newSalesOrganicRevenue`, `newSalesAffiliateCount`, `newSalesAffiliateRevenue`, `newSalesComercialCount`, `newSalesComercialRevenue`, `topNewAffiliates`.

### 2. WhatsApp — expandir seção "HOJE — Vendas" (linha ~1167):

```
💰 *HOJE — Vendas*
Vendas novas: 61 (R$ 3.0k)
  Organico: 35 (R$ 1.8k) | Afiliados: 22 (R$ 1.0k) | Comercial: 4 (R$ 0.2k)
  Top afiliados: CIRILO 15 deals, Maria 7 deals
Recorrencias: 120 (R$ 19.1k)
Total: 181 fechamentos | R$ 22.1k
```

Se afiliados > 50% das vendas novas, adicionar alerta automático:
`⚠️ Afiliados representam X% das vendas novas — risco de dependencia`

### 3. Prompt da IA — enriquecer bloco VENDAS HOJE:

```
VENDAS NOVAS DETALHAMENTO:
- Organico (pagina propria): X vendas, R$ Y
- Afiliados: Z vendas, R$ W (Top: CIRILO 15, Maria 7)
- Comercial (vendedor): N vendas, R$ M
ALERTA: Se afiliados > 50% das vendas novas, sugerir diversificacao
```

Instrução adicional: `Se afiliados dominam vendas novas (>50%), [SUGESTOES] DEVE incluir acao de diversificacao de canais.`

### 4. Email HTML — mesma sub-classificação

Dentro do card "Vendas Novas" existente, adicionar mini-breakdown visual (3 chips: Orgânico / Afiliados / Comercial com cores distintas).

### 5. Alerta de concentração (dentro de `alerts[]` existente, linha ~435):

```typescript
const affPctNew = newSalesCount > 0 
  ? Math.round((newSalesAffiliateCount / newSalesCount) * 100) : 0;
if (affPctNew >= 50) {
  alerts.push(`⚠️ Afiliados representam ${affPctNew}% das vendas novas — diversificar canais`);
}
```

## Impacto
- Zero regressão — apenas enriquece dados existentes
- Responde: "Quem vendeu?" com clareza (orgânico vs afiliado vs comercial)
- Gera alerta automático de dependência de afiliados
- IA consegue sugerir diversificação quando dados indicam concentração

