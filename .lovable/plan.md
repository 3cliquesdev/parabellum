

# Upgrade: AI Governor — Canais de Venda Detalhados + Performance do Time

## Resumo

Substituir a função `collectSalesMetrics` atual (linhas 74-157) pela versão completa que classifica deals por 7 origens distintas (Parceiros, Comercial Interno, Kiwify, Formulários, WhatsApp/WebChat, Orgânico, Outros), com ranking de parceiros, ranking do time comercial, e alertas de concentração.

Também atualizar o prompt da IA (linhas 159-184), o template HTML do email (linhas 362-415), e o payload do relatório salvo.

## Alterações

### 1. `collectSalesMetrics` (linhas 74-157) — Substituição completa

A nova versão:
- Busca `pipeline_sales_reps` para identificar o time comercial
- Busca deals won com campos adicionais: `affiliate_name`, `affiliate_commission`, `assigned_to`, `tracking_code`
- Classifica cada deal com `classifyOrigin()` usando a hierarquia: parceiro → comercial → recorrência → formulário → canal → orgânico → outros
- Agrega por categoria com `deals`, `revenue`, `commission`, `pct`
- Gera `topPartners` (top 5 parceiros por receita)
- Gera `topReps` (top 5 vendedores por receita, buscando nomes em `profiles`)
- Gera `alerts` (concentração de parceiros ≥50%, parceiro individual ≥35%, time comercial sem fechamentos)
- Calcula MoM (mês anterior vs atual)
- Mantém todos os campos existentes (`wonToday`, `lostToday`, `newDeals`, `revenueToday`, `goalTarget`, `goalProgress`, etc.)

### 2. `generateAIAnalysis` prompt (linhas 159-184) — Adicionar dados de canais

Acrescentar ao prompt:
- Canais de venda do dia com percentuais
- Top parceiros
- Performance do time comercial
- Alertas de concentração

### 3. Template HTML do email (entre linhas 384-416) — Duas novas seções

**Seção "Canais de Venda"** (após Vendas do Dia):
- Lista cada canal ativo com emoji, label, percentual, deals e receita
- Barra de progresso colorida por concentração
- Alertas de concentração em destaque

**Seção "Performance do Time"** (após Canais, se houver vendedores):
- Tabela ranking com medalhas (🥇🥈🥉)
- Nome, deals, receita

### 4. Ajustes menores
- `metrics_snapshot` salvo inclui `origins`, `topPartners`, `topReps`, `alerts`
- Mensagem WhatsApp inclui resumo de canais e time

### Arquivo afetado
- `supabase/functions/ai-governor/index.ts`

### Impacto
- **Upgrade puro**: todos os campos existentes são preservados
- Nenhuma mudança em outros arquivos
- Email fica mais completo sem quebrar a estrutura atual

