

# Implementar aba "Meu Onboarding" no Client Portal

## O que será feito

Substituir o placeholder "Em breve disponível" por uma aba funcional que mostra o progresso real do onboarding do cliente autenticado.

## Arquivos

### 1. Criar `src/hooks/useClientOnboarding.ts`
- Reutilizar o padrão de `ClientTicketsList` para buscar `contact_id` pelo email do usuário
- Buscar `playbook_executions` com `status IN ('running', 'waiting_form')` e `contact_id` do cliente
- Para cada execução, buscar `customer_journey_steps` ordenados por `position`
- Incluir nome do playbook via join com `onboarding_playbooks`
- Retornar: execuções ativas, steps por execução, progresso calculado (completados/total)

### 2. Criar `src/components/client-portal/OnboardingProgress.tsx`
- Barra de progresso no topo: "X de Y etapas concluídas (Z%)"
- Checklist vertical dos steps:
  - **Concluído** (`completed = true`): ícone verde ✅, texto com `line-through`, fundo `bg-green-50`
  - **Atual/pendente** (primeiro não concluído): ícone azul 🔵, destaque `border-blue-500`, se `step_type = 'form'` e `form_id` existir → botão "Preencher agora →" abrindo `/public-onboarding/{execution_id}`
  - **Futuro**: ícone cinza ⬜, texto `text-gray-400`, aparência bloqueada
- Se `step_type = 'task'` → texto informativo "Em processamento pela equipe"
- Estado vazio (sem execuções ativas): mensagem "Seu onboarding está completo! 🎉" ou "Nenhum onboarding ativo"
- Todas as classes CSS explícitas (sem semânticas de tema) seguindo padrão do portal

### 3. Atualizar `src/pages/ClientPortal.tsx`
- Importar `OnboardingProgress`
- Substituir o bloco placeholder (linhas 146-151) por `<OnboardingProgress />`

## Fluxo de dados
```text
user.email → contacts.email → contact_id
  → playbook_executions (status in running/waiting_form)
    → customer_journey_steps (order by position)
      → render checklist + progress bar
```

## Estilo
Cores explícitas (`bg-white`, `text-gray-900`, `border-gray-200`, `bg-green-50`, `text-blue-600`) — mesmo padrão já usado em `ClientTicketsList` e `ReturnsList`.

