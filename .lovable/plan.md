

# Análise de Saúde do Sistema — Inbox, IA, Fluxo e Distribuição

## Resultado Geral

| Módulo | Status | Detalhes |
|--------|--------|----------|
| **Webhook WhatsApp** | ✅ OK | Mensagens sendo recebidas, salvas e roteadas corretamente |
| **Process Chat Flow** | ✅ OK | Fluxos executando, condições multi-regra funcionando, proteção copilot ativa |
| **AI Autopilot** | ✅ OK | Respostas sendo geradas, fallback de violação funcionando, trava financeira ativa |
| **Distribuição** | ⚠️ Sem agentes online | Funcional, mas nenhum agente online nos departamentos monitorados — jobs ficam em espera |
| **Email Webhook** | 🔴 BUG ATIVO | Erro repetitivo a cada poucos segundos |

---

## 🔴 BUG: Email Webhook — `email_delivered` e `email_bounce` não existem no enum

**O que acontece:** O `email-webhook` tenta inserir interações com tipo `email_delivered` e `email_bounce`, mas o enum `interaction_type` no banco só tem: `email_sent`, `email_open`, `email_click` (entre outros). Os tipos `email_delivered` e `email_bounce` **nunca foram adicionados**.

**Impacto:** Cada email entregue ou com bounce gera um erro no log. As interações de entrega não são registradas na timeline do cliente. Emails abertos e clicados funcionam normalmente.

**Frequência:** Dezenas de erros por minuto nos logs (cada delivery webhook do provedor de email falha).

### Correção

**Migration SQL** — adicionar os dois valores faltantes ao enum:
```sql
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'email_delivered';
ALTER TYPE interaction_type ADD VALUE IF NOT EXISTS 'email_bounce';
```

Nenhuma alteração de código necessária. O `email-webhook/index.ts` já usa os valores corretos — apenas o enum no banco está incompleto.

---

## ⚠️ Observação: Distribuição

Os logs mostram `No online agents in dept` para dois departamentos. Isso não é bug — é situação operacional (agentes offline). O dispatcher está funcionando corretamente e fará requeue quando agentes ficarem online.

## ✅ Destaques Positivos

- **Trava financeira** implementada e ativa (fix anterior funcionando)
- **Copilot mode** respeitado — fluxo e IA bloqueados quando `ai_mode=copilot`
- **HMAC signature** validando corretamente no webhook WhatsApp
- **Flow engine** criando states, avaliando condições multi-regra, avançando nós automaticamente
- **AI fallback** funcionando — quando IA viola restrição (pergunta detectada), fallback_message é aplicado

