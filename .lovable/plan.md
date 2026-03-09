

# Plano: Substituir Transfers por Sequências Automatizadas no Fluxo Teste

## Resumo
Remover os dois nós `transfer_to_fin` e `transfer_to_canc` e suas edges, substituindo por sequências completas de coleta + ticket + encerramento. Tudo via SQL UPDATE no `flow_definition` JSON.

## Ramo FINANCEIRO (13 novos nós)
Sequência que substitui `transfer_to_fin`:

```text
intent_router ──[financeiro]──→ fin_msg_seguranca (message)
  → fin_otp (verify_customer_otp, max_attempts:3)
  → fin_check_otp (condition: customer_verified == true)
     ├─ FALSE → fin_msg_falha (message) → fin_end_falha (end)
     └─ TRUE  → fin_msg_confirmado (message)
        → fin_ask_nome (ask_text: nome_completo)
        → fin_ask_pix (ask_text: chave_pix)
        → fin_ask_banco (ask_text: banco)
        → fin_ask_motivo (ask_options: motivo_financeiro)
        → fin_ask_valor (ask_text: valor_solicitado)
        → fin_create_ticket (create_ticket: financeiro, high)
        → fin_msg_ok (message: protocolo aberto)
        → fin_end (end)
```

## Ramo CANCELAMENTO (5 novos nós)
Sequência que substitui `transfer_to_canc`:

```text
intent_router ──[cancelamento]──→ canc_ask_motivo (ask_options)
  → canc_ask_obs (ask_text: observacao_cancelamento)
  → canc_create_ticket (create_ticket: CS, high)
  → canc_msg_ok (message: solicitação recebida)
  → canc_end (end)
```

## Implementação Técnica

**1 SQL UPDATE** no `flow_definition` do fluxo `abc6cfc0-...`:

1. **Remover** os 2 nós (`transfer_to_fin`, `transfer_to_canc`) e suas 2 edges do `intent_router`
2. **Adicionar** 18 novos nós com posições calculadas (coluna financeiro ~x:-400, coluna cancelamento ~x:500)
3. **Adicionar** 19 novas edges conectando as sequências
4. **Reconectar** `intent_router` handles: `rule_intent_fin` → `fin_msg_seguranca`, `rule_intent_canc` → `canc_ask_motivo`

### Dados dos nós create_ticket:

**Financeiro:**
- subject_template: `{{motivo_financeiro}} — {{contact_name}}`
- description_template: carimbo OTP completo
- ticket_category: `financeiro`, priority: `high`
- department_id: `af3c75a9-2e3f-49f1-8e0b-7fb3f4b5ee45`
- internal_note: "OTP verificado ✅ | Criado automaticamente via fluxo"
- use_collected_data: true

**Cancelamento:**
- subject_template: `Cancelamento — {{contact_name}} | {{motivo_cancelamento}}`
- description_template: dados de cancelamento
- ticket_category: `outro`, priority: `high`
- department_id: `b7149bf4-1356-4ca5-bc9a-8caacf7b6e80`
- internal_note: "CS deve contatar o cliente em até 24h ANTES de qualquer reembolso"
- use_collected_data: true

### Nenhum transfer em nenhum dos ramos
Ambos terminam com `end` (end_action: "none"). O time age pelo ticket.

## Impacto
- Zero alteração em código frontend (todos os node types já existem)
- Zero alteração em edge functions (motor já processa todos esses tipos)
- Apenas dados no `flow_definition` JSON do fluxo teste
- Fluxo master de produção **não é afetado**

