

# Plano: Corrigir alucinação após detecção de email no fluxo

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico

A conversa #CC381749 estava fluindo normalmente com a IA respondendo contextualmente (pedidos, plano creation, saque). Quando o contato enviou `libertecdados@gmail.com`, o sistema:

1. **Detectou o email** e encontrou que pertence a "Ronny teste Ronny teste" (customer `ceb1d054`)
2. **Revinculou a conversa** ao contato "Ronny teste" (correto em termos de identificação)
3. **Enviou mensagem hardcoded**: `"Encontrei seu cadastro, Ronny teste Ronny teste! 🎉 Agora me diz: precisa de ajuda com: 1 - Pedidos / 2 - Sistema"`

### Dois problemas distintos:

**Problema 1 — Nome errado no contexto**: O contato está conversando como "Oliver Contato" mas a mensagem usa o nome do customer encontrado no banco ("Ronny teste Ronny teste"). Em cenário de teste, isso parece alucinação.

**Problema 2 — Menu hardcoded quebra o fluxo**: Quando `flow_context` está ativo (IA vinha respondendo bem), a triagem de email injeta um menu estático "Pedidos/Sistema" que **não tem relação com o que o contato estava perguntando** (ele queria sacar saldo). O fluxo da conversa é completamente interrompido por um menu genérico.

### Causa raiz no código

Em `ai-autopilot-chat/index.ts`:
- **Linha 2714**: `foundMessage` usa `verifyResult.customer?.name` (nome do customer do banco, não do contato atual)
- **Linhas 2808-2812**: Quando `flow_context` está ativo e não há consultor, o sistema envia `foundMessage` (menu hardcoded) como `autoResponse`, em vez de deixar a IA continuar respondendo contextualmente

## Solução

### Mudança 1: Quando `flow_context` está ativo, não enviar menu hardcoded

Se o `flow_context` está ativo (IA vinha respondendo), após verificar o email devemos:
- Confirmar identificação com mensagem simples (sem menu)
- Deixar a IA continuar respondendo ao assunto original do contato
- O fluxo da conversa não deve ser interrompido pelo menu de triagem

```typescript
// Linha 2809-2812 — branch: sem consultor, COM flow_context
} else if (!consultantId && flow_context) {
  // flow_context ativo sem consultor: confirmar email e deixar IA continuar
  console.log('[ai-autopilot-chat] ✅ Email verificado com flow_context ativo - IA continua sem menu');
  autoResponse = `Encontrei seu cadastro! ✅ Continuando seu atendimento...`;
}
```

E manter o `else` final apenas para quando NÃO tem flow_context (caso legítimo de triagem):

```typescript
} else {
  // Sem consultor, sem flow_context - Master Flow assume triagem
  autoResponse = foundMessage; // Menu de triagem só aparece sem contexto
}
```

### Mudança 2: Usar nome do contato atual, não do customer do banco

Na construção do `foundMessage` (linha 2714), priorizar o nome do contato atual da conversa:

```typescript
// Antes (errado):
verifyResult.customer?.name || verifyResult.customer_name || contact.first_name || 'cliente'

// Depois (correto):
contact.first_name || verifyResult.customer?.name || 'cliente'
```

Isso evita que o sistema chame "Oliver" de "Ronny" durante um teste.

## Arquivo e linhas

| Arquivo | Linhas | Mudança |
|---|---|---|
| `ai-autopilot-chat/index.ts` | 2710, 2714 | Priorizar `contact.first_name` no template de nome |
| `ai-autopilot-chat/index.ts` | 2797 | Mesma correção de nome no branch de consultor |
| `ai-autopilot-chat/index.ts` | 2809-2812 | Separar branch: com `flow_context` → sem menu, IA continua |

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — menu de triagem continua funcionando quando não há flow_context |
| Upgrade | Sim — IA não é mais interrompida por menu genérico durante conversa contextual |
| Kill Switch | Não afetado |
| Fluxo nunca mudo | Sim — mensagem de confirmação é enviada, IA continua |

