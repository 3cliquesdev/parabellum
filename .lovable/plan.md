
# Plano: Sistema de Emails Transacionais com Triggers Kiwify

## Visao Geral

Implementar um sistema completo de disparo automatico de emails baseado em eventos Kiwify, dando **autonomia total** para ligar/desligar templates por trigger sem precisar de desenvolvedor.

---

## Arquitetura Atual

### O que ja existe:
- **Tabela `email_templates`** com campo `trigger_type` e `is_active`
- **Edge Function `send-email`** que envia via Resend com branding
- **Edge Function `get-email-template`** que busca template por trigger
- **Triggers existentes**: `deal_won`, `deal_lost`, `deal_created`, `contact_created`, `playbook_step`, `manual`

### O que falta:
- Triggers especificos para eventos Kiwify
- Integracao no webhook para disparar emails automaticamente
- UI para gerenciar triggers (ligar/desligar)

---

## Novos Triggers a Implementar

| Trigger Type | Evento Kiwify | Descricao | Variaveis Disponiveis |
|--------------|---------------|-----------|----------------------|
| `order_paid` | `paid` / `order_approved` | Primeira compra aprovada | cliente, produto, valor, order_id |
| `subscription_renewed` | `subscription_renewed` | Renovacao de assinatura | cliente, produto, valor, ltv |
| `cart_abandoned` | `cart_abandoned` | Carrinho abandonado | cliente, produto, valor, link_recuperacao |
| `payment_refused` | `refused` / `payment_refused` | Cartao recusado | cliente, produto, valor, motivo |
| `subscription_card_declined` | `subscription_card_declined` | Cartao da assinatura recusado | cliente, produto, dias_atraso |
| `subscription_late` | `subscription_late` | Assinatura em atraso | cliente, produto, dias_atraso |
| `upsell_paid` | paid (cliente existente) | Upsell aprovado | cliente, produto, valor, ltv_novo |
| `refunded` | `refunded` | Reembolso processado | cliente, produto, valor |
| `churned` | `chargedback` / `subscription_canceled` | Churn/Cancelamento | cliente, produto, motivo |

---

## Implementacao Tecnica

### Etapa 1: Criar Edge Function `send-triggered-email`

Nova funcao dedicada para disparar emails baseados em trigger_type:

```text
supabase/functions/send-triggered-email/index.ts

Entrada:
{
  trigger_type: string,          // Ex: "order_paid"
  contact_id: string,            // ID do contato
  variables: {                   // Variaveis dinamicas
    customer_name: string,
    product_name: string,
    order_value: number,
    order_id: string,
    ...
  }
}

Logica:
1. Buscar template ativo com trigger_type correspondente
2. Se nao encontrar template ativo, retornar silenciosamente (sem erro)
3. Substituir variaveis no subject e html_body
4. Chamar send-email com o conteudo processado
```

### Etapa 2: Integrar no Webhook Kiwify

Modificar `kiwify-webhook/index.ts` para chamar `send-triggered-email` em cada evento:

```text
Eventos e triggers:

case 'paid' / 'order_approved':
  - Se novo cliente: trigger = 'order_paid'
  - Se cliente existente: trigger = 'upsell_paid'

case 'subscription_renewed':
  - trigger = 'subscription_renewed'

case 'cart_abandoned':
  - trigger = 'cart_abandoned'

case 'refused' / 'payment_refused':
  - trigger = 'payment_refused'

case 'subscription_card_declined':
  - trigger = 'subscription_card_declined'

case 'subscription_late':
  - trigger = 'subscription_late'

case 'refunded':
  - trigger = 'refunded'

case 'chargedback' / 'subscription_canceled':
  - trigger = 'churned'
```

### Etapa 3: Atualizar UI de Templates

Modificar `EmailTemplateDialog.tsx` para incluir novos triggers:

```text
Adicionar ao SelectContent de trigger_type:

// === EVENTOS KIWIFY ===
<SelectItem value="order_paid">Compra Aprovada (Kiwify)</SelectItem>
<SelectItem value="subscription_renewed">Assinatura Renovada</SelectItem>
<SelectItem value="cart_abandoned">Carrinho Abandonado</SelectItem>
<SelectItem value="payment_refused">Cartao Recusado</SelectItem>
<SelectItem value="subscription_card_declined">Cartao Assinatura Recusado</SelectItem>
<SelectItem value="subscription_late">Assinatura em Atraso</SelectItem>
<SelectItem value="upsell_paid">Upsell Aprovado</SelectItem>
<SelectItem value="refunded">Reembolso Processado</SelectItem>
<SelectItem value="churned">Churn/Cancelamento</SelectItem>
```

### Etapa 4: Adicionar Variaveis Especificas

Expandir `AVAILABLE_VARIABLES` no dialog:

```text
Novas variaveis para templates Kiwify:

kiwify: [
  { key: "[PRODUCT_NAME]", description: "Nome do produto" },
  { key: "[ORDER_VALUE]", description: "Valor do pedido" },
  { key: "[ORDER_ID]", description: "ID do pedido Kiwify" },
  { key: "[CUSTOMER_LTV]", description: "LTV total do cliente" },
  { key: "[RECOVERY_LINK]", description: "Link de recuperacao" },
  { key: "[PAYMENT_REASON]", description: "Motivo da recusa" },
  { key: "[SUBSCRIPTION_DAYS_LATE]", description: "Dias em atraso" },
]
```

---

## Fluxo de Autonomia

### Como o usuario ativa/desativa:

```text
1. Acessar: Configuracoes → Templates de Email
2. Criar novo template OU editar existente
3. Selecionar Trigger: Ex: "Carrinho Abandonado"
4. Switch "Template Ativo": ON/OFF
5. Salvar

Pronto! O sistema automaticamente:
- Se ON: Dispara email quando evento ocorre
- Se OFF: Nao dispara (silencioso)
```

### Regras de Negocio:

- Apenas 1 template ativo por trigger_type (evitar duplicidade)
- Se template inativo, evento passa sem enviar email
- Logs registrados em `email_tracking_events` para auditoria

---

## Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/send-triggered-email/index.ts` | CRIAR | Nova edge function |
| `supabase/functions/kiwify-webhook/index.ts` | MODIFICAR | Integrar disparo de emails |
| `src/components/EmailTemplateDialog.tsx` | MODIFICAR | Adicionar novos triggers e variaveis |
| `src/pages/EmailTemplates.tsx` | MODIFICAR | Atualizar labels de triggers |

---

## Variaveis por Trigger

| Trigger | Variaveis Obrigatorias |
|---------|------------------------|
| `order_paid` | CUSTOMER_*, PRODUCT_NAME, ORDER_VALUE, ORDER_ID |
| `subscription_renewed` | CUSTOMER_*, PRODUCT_NAME, ORDER_VALUE, CUSTOMER_LTV |
| `cart_abandoned` | CUSTOMER_*, PRODUCT_NAME, ORDER_VALUE, RECOVERY_LINK |
| `payment_refused` | CUSTOMER_*, PRODUCT_NAME, ORDER_VALUE, PAYMENT_REASON |
| `subscription_card_declined` | CUSTOMER_*, PRODUCT_NAME, SUBSCRIPTION_DAYS_LATE |
| `subscription_late` | CUSTOMER_*, PRODUCT_NAME, SUBSCRIPTION_DAYS_LATE |
| `upsell_paid` | CUSTOMER_*, PRODUCT_NAME, ORDER_VALUE, CUSTOMER_LTV |
| `refunded` | CUSTOMER_*, PRODUCT_NAME, ORDER_VALUE |
| `churned` | CUSTOMER_*, PRODUCT_NAME |

---

## Exemplo de Template Pre-Criado

### Carrinho Abandonado

```text
Nome: Recuperacao - Carrinho Abandonado
Trigger: cart_abandoned
Assunto: [CUSTOMER_FIRST_NAME], voce esqueceu algo! 🛒

Corpo:
<h2>Ola [CUSTOMER_FIRST_NAME]!</h2>
<p>Notamos que voce nao finalizou sua compra de <strong>[PRODUCT_NAME]</strong>.</p>
<p>O valor de <strong>R$ [ORDER_VALUE]</strong> ainda esta disponivel!</p>
<p style="margin: 24px 0;">
  <a href="[RECOVERY_LINK]" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
    Finalizar Compra
  </a>
</p>
```

---

## Resumo da Autonomia

| Acao | Quem Faz | Como |
|------|----------|------|
| Criar template | Usuario | Interface Templates de Email |
| Ativar/Desativar | Usuario | Switch na edicao do template |
| Mudar conteudo | Usuario | Editor de templates |
| Adicionar variaveis | Usuario | Painel lateral de variaveis |
| Ver historico | Usuario | Email Tracking Events |

**Zero dependencia de desenvolvedor para operacao diaria.**

---

## Ordem de Implementacao

```text
1. Criar edge function send-triggered-email
2. Modificar webhook Kiwify para chamar a funcao
3. Atualizar UI com novos triggers e variaveis
4. Criar templates padrao (opcionais) para cada trigger
5. Testar fluxo completo
```
