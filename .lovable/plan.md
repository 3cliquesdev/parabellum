

# Diagnóstico: IA não tenta resolver — envia fallback direto

## Problema identificado

A mensagem "Olá, vim pelo site e gostaria de atendimento" segue este caminho no `ai-autopilot-chat`:

```text
1. Classificação de intenção → "search" (não é saudação pura)
2. Busca na KB → encontra 5 artigos, mas nenhum relevante
3. Strict RAG check (linha 4146) → shouldHandoff: true (confiança 0%)
4. flow_context existe → retorna flow_advance_needed (linha 4177)
5. Webhook re-invoca process-chat-flow com forceAIExit
6. Fluxo avança → envia fallback "Vou te direcionar para nosso menu..."
7. Cliente não responde → auto-close por inatividade
```

O código de **boas-vindas para contato genérico** (linhas 4617-4696) EXISTE e detectaria essa mensagem corretamente (`isGenericContactRequest` = true), mas **nunca é alcançado** porque o Strict RAG intercepta antes (linha 4146) e retorna `flow_advance_needed`.

## Causa raiz

A ordem de execução está errada:
- **Strict RAG** (linha 4146) roda ANTES da detecção de greeting/contato genérico (linha 4617)
- Para mensagens vagas como "vim pelo site e gostaria de atendimento", Strict RAG encontra 0% de confiança e desiste imediatamente

## Plano de correção

### 1. Adicionar bypass de greeting/contato genérico ANTES do Strict RAG

No `ai-autopilot-chat/index.ts`, antes da linha 4146 (check do Strict RAG), inserir a mesma lógica de detecção que já existe nas linhas 4391/4617:

```typescript
// NOVO: Detectar saudações e contatos genéricos ANTES do Strict RAG
const isSimpleGreetingEarly = /^(oi|olá|ola|bom dia|boa tarde|boa noite|obrigad[oa]|valeu|ok)[\s!?.,]*$/i.test(customerMessage.trim());
const isGenericContactEarly = /^(ol[aá]|oi|bom dia|boa tarde|boa noite)?[,!.\s]*(vim|cheguei|estou|preciso|quero|gostaria|queria|buscando|procurando).{0,50}(atendimento|ajuda|suporte|falar|contato|informação|informações|saber|conhecer|entender)/i.test(customerMessage.trim());

if (isSimpleGreetingEarly || isGenericContactEarly) {
  // BYPASS Strict RAG — deixar a IA responder naturalmente
  console.log('[ai-autopilot-chat] 👋 Greeting/contato genérico detectado — BYPASS Strict RAG');
}
```

Se `isSimpleGreetingEarly || isGenericContactEarly`, pular o bloco de Strict RAG (linhas 4146-4185) para que a execução continue até a lógica de boas-vindas existente.

### 2. Garantir que a lógica de boas-vindas funcione com flow_context

A lógica de boas-vindas (linha 4641) atualmente verifica `confidenceResult.action === 'handoff'`. Com o bypass do Strict RAG, o `confidenceResult` normal será calculado e a mensagem de boas-vindas será enviada corretamente.

### 3. Nenhuma alteração no Master Flow ou Edge Functions de webhook

A correção é isolada ao `ai-autopilot-chat` — apenas reordenar a prioridade de checks.

## Resultado esperado

```text
ANTES:
Cliente: "Olá, vim pelo site e gostaria de atendimento"
→ Strict RAG → 0% confiança → flow_advance_needed → fallback → auto-close

DEPOIS:
Cliente: "Olá, vim pelo site e gostaria de atendimento"  
→ Bypass Strict RAG (contato genérico detectado)
→ Boas-vindas: "Olá! 👋 Ficamos felizes com seu contato! Em que posso te ajudar hoje?"
→ Cliente responde com dúvida real → IA processa normalmente
```

