

# Plano: Deploy da Edge Function ai-autopilot-chat

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico

O fix no código está **correto** (linha 5098: `&& !flow_context`). Os logs confirmam que `hasFlowContext: true` é recebido. Porém a edge function em execução não tem o fix aplicado — precisa ser redeployada.

**Evidência dos logs:**
- `02:45:12` — Request recebido com `hasFlowContext: true, flowId: "20a05c59"`
- `02:45:20` — Identity Wall disparou mesmo assim (`willAskForEmail: true`)
- A resposta da IA contém exatamente o texto da Identity Wall: "preciso que você me informe seu email"

## Solução

Redeployar a edge function `ai-autopilot-chat` para que o fix `&& !flow_context` entre em vigor.

Nenhuma mudança de código necessária — o arquivo já está correto. Apenas deploy.

## Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — apenas deploy do código já existente |
| Upgrade | Sim — Identity Wall bypass para fluxos entra em produção |

