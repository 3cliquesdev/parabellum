

# Upgrade: Contexto Técnico do Sistema no Prompt da IA Governante

## Problema
O prompt da IA recebe dados numéricos mas não sabe o estado técnico do sistema (configs, KB, modos de conversa, motivos de falha). Resultado: diagnósticos genéricos ("falta treinamento") em vez de causas reais ("todas conversas em copilot, autopilot não ativo").

## Mudanças — Arquivo único: `supabase/functions/ai-governor/index.ts`

### 1. Expandir `collectDayMetrics` com dados técnicos
Adicionar ao final da função (antes do return, ~linha 71):
- **KB coverage**: count de `knowledge_base_articles` ativas com embedding
- **Modos de conversa**: contar `autopilot` vs `copilot` das conversas do dia (já temos `convs` carregado)
- **AI configs**: buscar `system_configurations` (strict_rag_mode, rag_min_threshold, confidence_direct, block_financial)
- **Top fail reasons**: buscar `ai_events` com event_types de falha (handoff_exit, blocked_financial, blocked_commercial, transfer, no_answer), agregar por tipo

Retornar: `kbArticlesCount`, `autopilotConvs`, `copilotConvs`, `aiConfig`, `topFailReasons`

### 2. Adicionar contexto técnico ao prompt em `generateAIAnalysis` (~linha 349)
Inserir bloco `CONTEXTO DO SISTEMA` entre os dados e as instruções:
- Configs atuais da IA (strict_rag_mode, threshold, confidence_direct)
- Artigos KB ativos com embedding
- Conversas autopilot vs copilot
- Top motivos de falha/transferência
- Alucinações (se disponível)

### 3. Melhorar instruções por seção no prompt (~linha 390-408)
Substituir as instruções genéricas por instruções técnicas específicas:
- **[DESTAQUES]**: encontrar o melhor dado, citar número exato
- **[ATENCAO]**: usar contexto do sistema para diagnóstico técnico (autopilot vs copilot, strict_rag_mode, top fails) — proibir "falta de treinamento"
- **[SUGESTOES]**: 3 ações: 1 técnica, 1 conteúdo KB, 1 comercial — com exemplos concretos
- **[MOTIVACIONAL]**: usar dados do dia, variar

## Impacto
- Zero regressão: dados existentes intocados, apenas enriquecimento
- Prompt mais longo mas dentro do limite de tokens (gpt-4o-mini suporta)
- Nenhuma mudança em tabelas, RLS ou outros arquivos

