
# Fix: Corrigir o Funil de Retencao - Onboarding

## Problema Identificado

O widget "Funil de Retencao - Onboarding" (`useOnboardingFunnel.tsx`) usa fontes de dados incorretas:

| Etapa | Fonte Atual (errada) | Fonte Correta |
|-------|---------------------|---------------|
| Compra Aprovada | `contacts` com `status=customer` | `deals` no pipeline CS - Novos Clientes |
| Primeiro Login | **Todas** `playbook_executions` (qualquer playbook) | Deveria filtrar por playbook especifico de onboarding |
| Email Entregue | `email_tracking_events` (tabela sem dados) | `email_sends` com `sent_at IS NOT NULL` |
| Concluiu Onboarding | `playbook_executions` com `status=completed` | Idem, mas filtrado por playbook correto |

## Solucao Proposta

Duas opcoes:

### Opcao A: Remover o widget antigo e manter apenas o novo (Recomendado)

O novo `CSEmailFunnelWidget` ja usa as fontes corretas e mostra exatamente os dados pedidos:
1. Total de vendas novas (deals no pipeline CS)
2. 1o email entregue (email_sends com sent_at)
3. 2o email aberto (email_sends com opened_at)

Remover o `OnboardingFunnelWidget` do dashboard para evitar confusao com dados errados.

### Opcao B: Corrigir o widget antigo

Reescrever o `useOnboardingFunnel.tsx` para usar as mesmas fontes do `useCSOnboardingEmailFunnel`:
- Trocar `contacts` por `deals` do pipeline CS
- Filtrar `playbook_executions` pelo playbook de onboarding especifico
- Trocar `email_tracking_events` por `email_sends`

## Recomendacao

**Opcao A** e mais limpa: o novo widget ja resolve o problema, manter o antigo com dados errados so gera confusao. Se quiser adicionar "Primeiro Login" e "Concluiu Onboarding" como etapas extras, podemos expandir o CSEmailFunnelWidget para incluir essas metricas (filtrando pelo playbook correto).

## Mudancas Tecnicas

### Opcao A (remover widget antigo):
- **Arquivo**: `src/components/analytics/AdvancedTab.tsx` - Remover import e uso do `OnboardingFunnelWidget`
- Arquivos `src/hooks/useOnboardingFunnel.tsx` e `src/components/widgets/OnboardingFunnelWidget.tsx` podem ser mantidos (sem impacto) ou removidos

### Opcao B (corrigir widget antigo):
- **Arquivo**: `src/hooks/useOnboardingFunnel.tsx` - Reescrever queries para usar `deals` + `email_sends`
- Precisaria identificar o ID do playbook de onboarding para filtrar execucoes

## Validacao
- Confirmar que os numeros do funil fazem sentido (vendas >= emails entregues >= emails abertos)
- Console sem erros
- Zero regressao em outros widgets do dashboard
