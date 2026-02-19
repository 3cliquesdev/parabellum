

## Correção: Barra de Aprovação Mostra Botões Indevidamente

### Situação Atual
- O ticket TK-2026-00337 tem status `returned` e categoria `financeiro`
- A barra de aprovação financeira aparece para admins em **qualquer** ticket financeiro (exceto resolved/closed)
- Os botões "Rejeitar" e "Aprovar Reembolso" aparecem mesmo quando **ninguém solicitou aprovação**
- Isso é confuso: parece que há aprovação pendente, mas o contador na sidebar mostra 0

### Problema
No `FinancialApprovalBar.tsx`, quando o status NAO é `pending_approval`, o componente mostra "Ticket financeiro disponível para revisão" com os mesmos botões de aprovação/rejeição. Isso permite aprovar/rejeitar sem que o agente tenha formalmente solicitado.

### Solução

**Arquivo: `src/components/FinancialApprovalBar.tsx`**

Alterar o comportamento para:
- **Status `pending_approval`**: Mostrar barra amarela com botões "Rejeitar" e "Aprovar Reembolso" (como está hoje)
- **Status `approved`**: Mostrar barra azul com "Concluir Reembolso" (como está hoje)
- **Qualquer outro status**: Mostrar apenas uma barra informativa discreta SEM botões de ação, indicando que a aprovação precisa ser solicitada primeiro pelo agente

**Arquivo: `src/components/TicketDetails.tsx`**

Ajustar a condição `canApprove` para incluir o status `returned` na lista de exibição, mas a barra em si controlará o que aparece (informativo vs ação).

### Detalhes Tecnicos

No `FinancialApprovalBar.tsx`, adicionar um guard antes dos botões:

```text
Se status !== 'pending_approval' e status !== 'approved':
  - Mostrar apenas texto informativo: "Aguardando solicitacao de aprovacao pelo agente."
  - NAO mostrar botões de Rejeitar/Aprovar
  - Estilo discreto (cinza/muted)
```

Isso garante que:
1. Admins veem que o ticket e financeiro (informativo)
2. Botões de ação so aparecem apos solicitação formal
3. Contador "Aguard. Aprovação" continua correto (so conta `pending_approval`)
4. Sem downgrade: tickets com `pending_approval` continuam funcionando igual

### Impactos
- Sem downgrade: fluxo de aprovação existente preservado
- Upgrade: elimina confusão visual e previne aprovações sem solicitação formal
