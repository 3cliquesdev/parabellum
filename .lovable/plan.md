

# Plano: Unificar Teste + Escolha de Fluxo em uma acao

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Problema Real

O botao "Teste" e o seletor de fluxo sao SEPARADOS. O usuario ativa teste, depois precisa clicar em outro botao para escolher o fluxo. Isso causa:
- Janela de tempo onde teste esta ativo mas nenhum fluxo foi escolhido
- Se o contato envia mensagem nessa janela, o Master Flow pode ter rodado ANTES do teste
- Confusao visual com mensagens antigas identicas

## Solucao: Unificar em um unico componente

### Mudanca 1: `TestModeDropdown.tsx` — Transformar em dropdown com flow picker integrado

Quando clicar no botao "Teste":
- Se teste esta **desativado**: abre dropdown com lista de fluxos (ativos + rascunhos). Ao escolher um fluxo, ativa `is_test_mode = true` E inicia o fluxo escolhido simultaneamente.
- Se teste esta **ativado**: clique desativa `is_test_mode = false` e cancela o fluxo ativo.

```text
┌──────────────────────────────┐
│  🧪 Escolha o fluxo de teste │
├──────────────────────────────┤
│  Ativos                      │
│  📝 Master Flow + IA Entrada │
│  📝 Fluxo de Vendas          │
├──────────────────────────────┤
│  🧪 Rascunhos                │
│  📝 Master Flow (Rascunho)   │
│  📝 Novo Fluxo Beta          │
└──────────────────────────────┘
```

Ao selecionar:
1. `supabase.update({ is_test_mode: true })` na conversa
2. `supabase.functions.invoke('process-chat-flow', { manualTrigger: true, flowId, bypassActiveCheck: isDraft })` para iniciar

Tudo em uma acao atomica.

### Mudanca 2: `ChatWindow.tsx` — Remover `FlowPickerButton` separado quando em modo teste

O `FlowPickerButton` no header continua existindo para uso normal (fora do modo teste), mas quando `isTestMode = true`, o botao de fluxo fica desabilitado ou oculto (o fluxo ja foi escolhido no ato de ativar o teste).

### Mudanca 3: `MessagesWithMedia.tsx` — Destacar mensagens apos separador de teste

Apos detectar mensagem system com "TESTE DE FLUXO INICIADO", aplicar borda lateral amarela (`border-l-2 border-warning`) nas mensagens seguintes para distinguir visualmente do historico anterior.

### Mudanca 4: Backend ja esta correto

- Guard em `process-chat-flow` (linha 1332-1345): bloqueia auto-triggers em modo teste -- JA FUNCIONA
- Guard em `meta-whatsapp-webhook` (linha 671-673): silencia mensagens em modo teste -- JA FUNCIONA  
- Fluxo completo -> proximo "Boa noite" -> sem estado ativo + isTestMode -> guard bloqueia -- JA FUNCIONA

Nenhuma mudanca no backend necessaria.

## Resumo de arquivos

| Arquivo | Mudanca |
|---|---|
| `src/components/inbox/TestModeDropdown.tsx` | Transformar em dropdown com lista de fluxos integrada |
| `src/components/ChatWindow.tsx` | Ajustar props e logica de visibilidade do FlowPickerButton |
| `src/components/inbox/MessagesWithMedia.tsx` | Borda lateral amarela apos separador de teste |

## Impacto

| Regra | Status |
|---|---|
| Regressao zero | Sim — FlowPickerButton continua funcional fora do modo teste |
| Upgrade | Sim — elimina janela de tempo entre ativar teste e escolher fluxo |
| Kill Switch | Nao afetado |
| Fluxo nunca mudo | Nao afetado — fluxo ja e iniciado no ato de ativar teste |

