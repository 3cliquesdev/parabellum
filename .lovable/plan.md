

# Fix: Incluir seção de Inbox/IA no relatório WhatsApp + corrigir formato da análise IA

## Problema

1. **WhatsApp sem métricas de Inbox**: A mensagem WhatsApp (linha 736) mostra apenas `aiAnalysis` + canais de venda + time comercial. Os KPIs brutos do inbox (conversas, resolvidas pela IA, escaladas, tempo médio, mensagens) só aparecem no HTML do email.

2. **Formato da análise IA quebrado**: O prompt pede tags `[DESTAQUES]`, `[ATENCAO]`, `[SUGESTOES]`, `[MOTIVACIONAL]` mas a IA retorna markdown com `**`, `-`, bullets. O parser `formatAnalysisHtml` não encontra as tags e renderiza texto sem estilo.

## Solução

### Alteração 1: Adicionar seção de Inbox no WhatsApp (linha ~736)

Antes do `channelsSummary`, inserir:

```
📞 *Atendimento do Dia:*
💬 Conversas: ${metrics.totalConvs} | IA: ${metrics.closedByAI} | Escaladas: ${metrics.escalatedToHuman}
⏱ Tempo médio: ${metrics.avgResolutionMin ?? '—'} min
🤖 Eventos IA: ${metrics.totalAIEvents} | Msgs: ${metrics.totalMessages} (${metrics.aiMessages} IA)
${metrics.criticalAnomalies?.length > 0 ? '🔴 Anomalias: ' + metrics.criticalAnomalies.length + ' críticas' : ''}
```

### Alteração 2: Reforçar prompt da IA (linhas 272-292)

Adicionar instrução mais explícita:
- "NÃO use markdown (**, -, bullets). Use APENAS texto corrido."
- "Cada linha DEVE começar com a tag entre colchetes: [DESTAQUES], [ATENCAO], [SUGESTOES], [MOTIVACIONAL]"
- "Exemplo: [DESTAQUES] O dia teve 10 conversas com taxa de resolução IA de 30%."

### Arquivo afetado
- `supabase/functions/ai-governor/index.ts`

### Impacto
- WhatsApp passa a mostrar KPIs de inbox dedicados (upgrade puro)
- Email terá as seções coloridas corretas (fix de formatação)
- Nenhuma mudança em tabelas ou outros arquivos

