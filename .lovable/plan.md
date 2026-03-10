

# Dar autonomia à IA no Master Flow de Produção

## Problema atual

O nó **IA Suporte (Entrada)** no Master Flow tem `forbid_questions: true`. Quando a IA precisa fazer uma pergunta esclarecedora para resolver o problema do cliente, a restrição bloqueia → dispara `flow_advance_needed` → envia o fallback ("Vou te direcionar para nosso menu...") → cliente desiste.

A IA **não está tentando resolver** — ela é impedida pelas próprias restrições antes de ter chance.

## O que já funciona no fluxo de teste

O fluxo `⚠️ [CÓPIA TESTE]` já tem as configurações corretas:
- `forbid_questions: false` (IA pode perguntar)
- `exit_keywords` saneados (sem "menu", "opcoes", "pessoa")
- `max_sentences: 5`
- `context_prompt` com instruções de autonomia

## Plano: Aplicar as mesmas configurações ao Master Flow

### 1. Atualizar o nó `ia_entrada` no Master Flow via SQL

Alterar o `flow_definition` do fluxo `e44da799-c404-4c86-abe0-4aea2ca0ea1f` para:

| Parâmetro | Atual (Produção) | Novo |
|---|---|---|
| `forbid_questions` | `true` | `false` |
| `exit_keywords` | inclui "menu", "opcoes", "pessoa" | apenas `["atendente", "humano", "transferir", "consultor", "falar com alguém", "falar com alguem"]` |
| `max_sentences` | `4` | `5` |
| `context_prompt` | foco em não inventar | foco em **resolver** antes de transferir, fazer perguntas, 2-3 tentativas |

### 2. Manter travas de segurança

- `forbid_options: true` — IA não cria menus falsos
- `forbid_financial: true` — IA não resolve assuntos financeiros
- `fallback_message` permanece como rede de segurança
- `flow_advance_needed` continua funcionando para casos onde a IA realmente não consegue

### 3. Nenhuma alteração em Edge Functions

A lógica de `flow_advance_needed`, `restrictionCheck` e `forceAIExit` já está correta. O problema é **apenas configuração do nó**.

## Resultado esperado

A IA vai:
1. Receber a mensagem do cliente
2. Buscar na KB e CRM
3. Se não encontrar resposta direta → **perguntar** para entender melhor (em vez de transferir)
4. Tentar 2-3 interações antes de considerar saída
5. Só transferir se o cliente pedir explicitamente ou após esgotar tentativas

