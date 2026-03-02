

# Roteamento Comercial: Detectar intenção de compra e transferir para Comercial - Nacional

## Diagnóstico

Atualmente o sistema já tem uma **Trava Financeira** (`forbidFinancial`) que detecta intenções de saque/reembolso/estorno e bloqueia a IA, avançando para o próximo nó ou fazendo handoff direto. Porém, **não existe mecanismo equivalente para intenção comercial** (comprar, preço, proposta, etc.).

O `pickDepartment` já reconhece keywords comerciais, mas isso só é usado para classificação interna — não dispara transferência automática.

O departamento destino é **Comercial - Nacional** (`f446e202-bdc3-4bb3-aeda-8c0aa04ee53c`), que já está hardcoded em vários pontos do autopilot.

## Solução: Criar "Trava Comercial" espelhando a Trava Financeira

### Alteração 1 — `ai-autopilot-chat/index.ts`

Adicionar interceptação de intenção comercial na entrada, similar à financeira:

```text
Regex: /comprar|quero comprar|quanto custa|pre[çc]o|proposta|or[çc]amento|cat[aá]logo|assinar|plano|tabela de pre[çc]o|conhecer.*produto|demonstra[çc][aã]o|demo|trial|teste gr[aá]tis|upgrade|downgrade|mudar.*plano/i
```

- **Com fluxo ativo**: retornar `commercialBlocked: true` + `hasFlowContext: true` para o webhook re-invocar `process-chat-flow` com `forceCommercialExit: true`
- **Sem fluxo**: hard transfer direto para `DEPT_COMERCIAL_ID` (`f446e202-bdc3-4bb3-aeda-8c0aa04ee53c`) com `ai_mode: 'waiting_human'`

Mensagem fixa: *"Ótimo! Vou te conectar com nosso time comercial para te ajudar com isso."*

### Alteração 2 — `meta-whatsapp-webhook/index.ts`

No bloco que processa a resposta do autopilot, adicionar tratamento para `commercialBlocked` idêntico ao `financialBlocked`:

- Detectar `autopilotData.commercialBlocked`
- Se `hasFlowContext`, re-invocar `process-chat-flow` com `forceCommercialExit: true`
- Senão, enviar mensagem de handoff e atualizar conversa para `waiting_human` + departamento Comercial

### Alteração 3 — `process-chat-flow/index.ts`

Adicionar suporte a `forceCommercialExit`:

- Novo campo no nó AI: `forbid_commercial` (opcional, default `false`)
- Quando `forceCommercialExit: true` recebido, avançar para o próximo nó (igual ao `forceFinancialExit`)
- Propagar flag `forbidCommercial` para o autopilot

### Alteração 4 — Frontend: Propriedades do nó AI Response

Adicionar toggle "Bloquear intenção comercial (transferir)" nas propriedades do nó `ai_response`, similar ao toggle de trava financeira existente. Isso permite configurar por nó se a trava comercial está ativa.

## Impacto

- **Zero regressão**: mesma arquitetura da trava financeira já validada
- **Upgrade**: conversas com intenção de compra serão imediatamente direcionadas ao time Comercial - Nacional, tanto em fluxos quanto em conversas diretas com IA

