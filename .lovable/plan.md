

# Seletor de Fluxo — Visibilidade no Header

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Situação Atual

A consolidação anterior removeu a lista de fluxos do **TestModeDropdown** (header) para evitar duplicação. Porém, o **FlowPickerButton** continua existindo no **compositor de mensagens** (área inferior) — ele ainda permite escolher e iniciar fluxos (ativos + rascunhos quando test mode está ligado).

O problema é que o botão no compositor (ícone de Workflow `⎇`) pode não estar visível ou óbvio para o usuário.

## Proposta

Adicionar um **FlowPickerButton** também no header, ao lado do toggle de teste, mantendo a proteção de `hasActiveFlow` para evitar o bug anterior de dois fluxos simultâneos.

| Mudança | Arquivo | Descrição |
|---|---|---|
| Adicionar FlowPickerButton no header | `ChatWindow.tsx` | Renderizar o componente ao lado do TestModeDropdown, passando `hasActiveFlow` e `isTestMode` |
| Nenhuma mudança | `FlowPickerButton.tsx` | Já possui toda a lógica necessária com validação |
| Nenhuma mudança | `TestModeDropdown.tsx` | Permanece como toggle simples |

### Detalhamento

**ChatWindow.tsx** — após o `<TestModeDropdown>`, adicionar:

```tsx
<FlowPickerButton
  conversationId={conversation.id}
  contactId={conversation.contact_id}
  isTestMode={isTestMode}
  hasActiveFlow={!!activeFlow}
/>
```

Isso garante:
- Um **único componente** (`FlowPickerButton`) gerencia o início de fluxos
- A proteção `hasActiveFlow` está centralizada — impede dois fluxos simultâneos
- O botão fica visível no header, onde o usuário espera encontrá-lo

### Impacto

| Regra | Status |
|---|---|
| Regressão zero | Sim — mesmo componente, mesma lógica, mesmo guard |
| Upgrade | Sim — melhora discoverability sem duplicar lógica |
| Bug anterior | Não retorna — proteção `hasActiveFlow` está no componente |

