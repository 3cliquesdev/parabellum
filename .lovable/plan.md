

# Ajuste do Dashboard de Telemetria AI Decision

## Gaps entre o prompt e a implementação atual

### Hook (`useAIDecisionTelemetry.ts`)
| Requisito | Atual | Ação |
|-----------|-------|------|
| 6 reason values específicos no prompt | Usa nomes antigos (`zero_confidence_cautious`, `confidence_flow_advance`, `anti_loop_max_fallbacks`) | Atualizar `reasonLabels` e KPI filters para os nomes reais usados na edge function |
| KPI: `totalHandoffs` = `confidence_handoff` + `strict_rag_handoff` | Filtra genérico por `includes("handoff")` | OK — já funciona |
| KPI: `totalFallbacks` = `fallback_phrase_detected` + `zero_confidence_zero_articles` | Filtra por `anti_loop` que não existe como reason name | Ajustar filtro |
| KPI: `totalViolations` = `restriction_violation` + `antiloop_fallback_count` | Só filtra `restriction_violation` | Adicionar `antiloop` ao filtro |
| Retorno: `byReason` (array com reason + count) | Retorna `typeBreakdown` com `name`+`value` | Renomear para clareza |

**Nota importante:** Os reason values na edge function são `zero_confidence_cautious`, `confidence_flow_advance`, `anti_loop_max_fallbacks` — não os nomes do prompt. O prompt pede `zero_confidence_zero_articles`, `confidence_handoff`, `antiloop_fallback_count`. Como a edge function já está em produção, vou manter os nomes reais da edge function e ajustar o dashboard para exibi-los corretamente com labels amigáveis.

### Página (`AITelemetry.tsx`)
| Requisito | Atual | Ação |
|-----------|-------|------|
| Badge com last update time | Ausente | Adicionar |
| KPI "Handoffs para Humano" amber | Usa `text-destructive` (vermelho) | Mudar para amber/warning |
| KPI "Fallbacks Detectados" red | Usa `text-warning` (amarelo) | Mudar para red/destructive |
| KPI "Violações" orange | Usa `text-destructive` | Mudar para orange |
| Charts 60%/40% split | 50/50 grid | Mudar para `lg:grid-cols-5` com `col-span-3`/`col-span-2` |
| Color mapping por tipo no bar chart | Cores genéricas por índice | Mapear cores fixas por reason |
| Percentage label em cada barra | Ausente | Adicionar |
| Tabela: coluna "Conversa" copyable on click | Apenas texto truncado | Adicionar onClick copy com toast |
| Tabela: coluna "Score" com cores (verde >0.7, amarelo 0.3-0.7, vermelho <0.3) | Sem cores | Adicionar lógica de cor |
| Tabela: coluna "Artigos" (articles_found) | Ausente | Adicionar coluna |
| Tabela: coluna "Fallback" (checkmark se fallback_used) | Ausente | Adicionar coluna |
| Tabela: coluna "Tempo" com tempo relativo ("há 3 min") | Usa formato `dd/MM HH:mm:ss` | Mudar para `formatDistanceToNow` |
| Tabela: sortable por Tempo | Não sortable | Adicionar sort toggle |
| Tabela: search/filter por decision type | Ausente | Adicionar select filter |
| Badge variants coloridos por reason type | Apenas 3 variantes genéricas | Mapear cores específicas |
| Empty state com ilustração | Texto simples | Melhorar com ícone centralizado |

### Routing
Rota e menu já existem — **nenhuma mudança necessária**.

### Edge Function
Os 6 inserts já estão implementados — **nenhuma mudança necessária**.

## Plano de implementação

### 1. Atualizar `useAIDecisionTelemetry.ts`
- Ajustar filtros KPI para alinhar com os reason values reais da edge function
- Adicionar `lastUpdated` timestamp ao retorno
- Manter lógica de query como está (já funciona)

### 2. Reescrever `AITelemetry.tsx`
- Adicionar badge de "última atualização" no header
- Ajustar cores dos KPIs: neutral, amber, red, orange
- Charts: layout 60/40 com `lg:grid-cols-5`
- Bar chart: cores fixas mapeadas por reason, labels com percentual
- Tabela: adicionar colunas Artigos e Fallback
- Tabela: score com cores condicionais
- Tabela: entity_id copyable com toast
- Tabela: tempo relativo com `formatDistanceToNow`
- Tabela: filtro por tipo de decisão (Select dropdown)
- Tabela: sort toggle por tempo
- Empty state com ícone Brain centralizado e texto descritivo
- Loading: skeleton cards + skeleton table rows (já existe parcialmente)

### Arquivos modificados
| Arquivo | Mudança |
|---------|---------|
| `src/hooks/useAIDecisionTelemetry.ts` | Ajustar filtros KPI, adicionar `lastUpdated` |
| `src/pages/AITelemetry.tsx` | Reescrever com todos os requisitos visuais do prompt |

Nenhuma mudança em edge functions, routing ou config.

