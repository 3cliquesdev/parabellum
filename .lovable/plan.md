

# Plano: 4 Saídas Dedicadas no Nó IA — Financeiro / Cancelamento / Comercial / Suporte

## Situação Atual

O nó IA tem apenas **2 handles**: `default` (padrão) e `ai_exit` (saída IA única). Todas as intenções (financeiro, cancelamento, comercial, suporte) saem pelo mesmo handle `ai_exit` e dependem de um nó `condition_v2` externo para separar os ramos via `ai_exit_intent`.

**Problema**: Isso adiciona complexidade desnecessária (nó extra de roteamento) e dificulta a leitura visual. Além disso, `keywordMatch` (suporte/humano) NÃO seta `ai_exit_intent`, então o ramo "Suporte" nunca é distinguido.

## Proposta: 4 Handles de Saída Dedicados

Cada intenção ganha seu próprio handle no nó IA, eliminando a necessidade do nó "Roteamento de Intenção":

```text
                    ┌─── default ────→ (próximo nó normal / max_interactions / fallback)
[IA Suporte] ──────┼─── financeiro ──→ [Segurança → OTP → PIX → Ticket]
                    ├─── cancelamento → [Motivo → Ticket Cancelamento]
                    ├─── comercial ───→ [Transferir → Comercial]
                    └─── suporte ─────→ [Transferir → Atendimento Humano]
```

## Alterações

### 1. AIResponseNode.tsx — 5 handles visuais

Substituir os 2 handles atuais por 5:
- **Target** (esquerda): entrada
- **default** (direita, topo): saída normal (max_interactions, fallback, próximo nó)
- **financeiro** (direita): cor amarela, label "💰 Financeiro"
- **cancelamento** (direita): cor vermelha, label "❌ Cancelamento"
- **comercial** (direita): cor verde, label "🛒 Comercial"
- **suporte** (direita): cor azul, label "🧑 Suporte"

Posicionados verticalmente espaçados (20%, 35%, 50%, 65%, 80%).

### 2. process-chat-flow/index.ts — path por intenção

Atualmente tudo seta `path = 'ai_exit'`. Mudar para paths específicos:

| Cenário | path atual | path novo |
|---|---|---|
| `financialIntentMatch` | `ai_exit` | `financeiro` |
| `cancellationIntentMatch` | `ai_exit` | `cancelamento` |
| `commercialIntentMatch` | `ai_exit` | `comercial` |
| `keywordMatch` (atendente/humano) | `undefined` | `suporte` |
| `aiExitForced` (IA pede handoff) | `ai_exit` | `suporte` |
| `maxReached` | `undefined` | `default` (sem mudança) |

Também setar `ai_exit_intent = 'suporte'` quando `keywordMatch` ou `aiExitForced`.

Manter fallback: se `path='financeiro'` e não achar edge, tentar `ai_exit`, depois `default`.

### 3. ai-autopilot-chat/index.ts — mesma lógica de intent

Alinhar os mesmos paths quando opera fora de fluxo (autopilot global).

### 4. Remover necessidade do nó "Roteamento de Intenção"

Com handles dedicados, o condition_v2 "Roteamento de Intenção" se torna opcional. O usuário conecta cada handle diretamente ao ramo correto no canvas. Mais limpo, mais visual, mais fácil de auditar.

### 5. findNextNode — suporte a fallback hierárquico

Atualizar `findNextNode` para tentar fallback quando não encontra edge para o path específico:
```
financeiro → ai_exit → default → null
cancelamento → ai_exit → default → null
comercial → ai_exit → default → null  
suporte → ai_exit → default → null
```

Isso mantém compatibilidade com fluxos existentes que usam `ai_exit` genérico.

## Resultado Visual no Canvas

O nó IA ficará com 5 pontos de saída coloridos no lado direito, cada um rotulado. O usuário arrasta edges de cada ponto para o destino correto. Qualquer pessoa que olhar o fluxo entende imediatamente o roteamento sem precisar abrir configurações de nós.

