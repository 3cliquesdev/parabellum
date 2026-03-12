

# Plano: Expandir lista de modelos OpenAI disponíveis

## Problema
A lista atual tem apenas 4 modelos (GPT-4o Mini, GPT-4o, GPT-4.1 Mini, GPT-4.1), mas a OpenAI oferece muitos mais. Além disso, a seção "Google Gemini" aparece vazia — já que usamos a API OpenAI direta, Gemini não funciona.

## Modelos a adicionar

| Modelo | Tipo | Descrição |
|---|---|---|
| `gpt-4o` | Chat | Máxima precisão (já existe) |
| `gpt-4o-mini` | Chat | Balanceado (já existe) |
| `gpt-4.1` | Chat | Última geração (já existe) |
| `gpt-4.1-mini` | Chat | Ultra rápido (já existe) |
| `gpt-4.1-nano` | Chat | **NOVO** - Mais barato, tarefas simples |
| `o4-mini` | Reasoning | **NOVO** - Raciocínio avançado, custo acessível |
| `o3` | Reasoning | **NOVO** - Raciocínio máximo |
| `o3-mini` | Reasoning | **NOVO** - Raciocínio econômico |

## Mudanças

### 1. `src/hooks/useRAGConfig.tsx` — Expandir `RAG_MODELS`
Adicionar os novos modelos com categorias (Chat vs Reasoning).

### 2. `src/components/settings/AIModelConfigCard.tsx` — Expandir `AI_MODELS`
Adicionar os novos modelos, organizar por categoria, remover seção "Google Gemini" vazia.

### 3. `src/components/settings/RAGOrchestratorWidget.tsx` — Atualizar seletor de modelo
Se houver seletor de modelo aqui, expandir também.

### 4. `supabase/functions/ai-autopilot-chat/index.ts` — Atualizar `sanitizeModelName`
Garantir que os novos modelos passem sem ser sanitizados (são nomes válidos da OpenAI).

## Resultado
- Lista completa de modelos OpenAI modernos
- Organizados por categoria (Chat / Reasoning)
- Seção "Google Gemini" removida (não funciona com API OpenAI direta)

