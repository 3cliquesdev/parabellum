
## Plano: Corrigir Bugs do Editor de Chat Flows

### Problemas Identificados

Confirmei no banco de dados que **os gatilhos estao sendo salvos corretamente**:
```
id: 52e49516-a74f-48b3-b318-3604b5323745
name: TESTE
trigger_keywords: ["Carnaval"]
triggers: ["Olá vim pelo email e gostaria de saber da promoção de pré carnaval"]
```

Os problemas relatados sao:

| # | Problema | Causa Raiz |
|---|----------|-----------|
| 1 | Nome do fluxo nao atualiza na UI | O hook `useChatFlow` nao esta sendo re-carregado apos salvar gatilhos |
| 2 | Nao sabe como usar os gatilhos | Falta documentacao visual - os gatilhos funcionam automaticamente no `ai-autopilot-chat` |
| 3 | Nao consegue sair da tela do fluxo | O botao de voltar esta sendo interceptado pelo ReactFlow (problema ja parcialmente corrigido mas incompleto) |
| 4 | Erro 404 aleatorio | A rota `/settings/chat-flows/:id/edit` esta envolta em `<Layout>` que forca re-render |

---

### Solucoes Propostas

#### 1. Corrigir Atualizacao do Nome na UI

**Problema**: Apos salvar os gatilhos, o hook `useChatFlow` invalida a query, mas o componente nao reflete a mudanca porque usa o estado `flow` do momento do carregamento inicial.

**Arquivo**: `src/pages/ChatFlowEditorPage.tsx`

**Correcao**:
- Adicionar `refetch` ou forcar re-render apos salvar settings
- Atualizar o titulo localmente apos sucesso do save

```tsx
// ANTES: apenas fecha o dialog
onSuccess: () => setSettingsOpen(false),

// DEPOIS: fecha + atualiza estado local ou refetch
onSuccess: () => {
  setSettingsOpen(false);
  // Invalidar query para atualizar dados do flow
  queryClient.invalidateQueries({ queryKey: ["chat-flow", id] });
}
```

#### 2. Adicionar Indicador Visual de Gatilhos Ativos

**Problema**: Usuario nao tem feedback de que os gatilhos foram salvos e estao funcionando.

**Arquivo**: `src/pages/ChatFlowEditorPage.tsx`

**Correcao**:
- Adicionar badge mostrando quantidade de keywords configuradas no header
- Mostrar tooltip explicando que os gatilhos sao usados automaticamente pelo chatbot IA

```tsx
// No header, apos o botao "Palavras-chave":
{(flow.trigger_keywords?.length > 0 || flow.triggers?.length > 0) && (
  <Badge variant="secondary" className="text-xs">
    {flow.trigger_keywords?.length || 0} palavras-chave
  </Badge>
)}
```

#### 3. Corrigir Navegacao de Volta (Problema 404 e Botao Travado)

**Problema Principal**: A rota esta definida como:
```tsx
<Route path="/settings/chat-flows/:id/edit" element={<Layout><ChatFlowEditorPage /></Layout>} />
```

Isso envolve o editor fullscreen dentro do Layout com Sidebar, causando conflitos de scroll e z-index.

**Arquivo**: `src/App.tsx` (linha 254)

**Correcao**:
- Remover `<Layout>` do ChatFlowEditorPage (editor fullscreen nao precisa de sidebar)
- Manter o ProtectedRoute

```tsx
// DE:
<Route path="/settings/chat-flows/:id/edit" element={<ProtectedRoute requiredPermission="settings.chat_flows"><Layout><ChatFlowEditorPage /></Layout></ProtectedRoute>} />

// PARA:
<Route path="/settings/chat-flows/:id/edit" element={<ProtectedRoute requiredPermission="settings.chat_flows"><ChatFlowEditorPage /></ProtectedRoute>} />
```

#### 4. Reforcar Botao de Voltar

**Arquivo**: `src/pages/ChatFlowEditorPage.tsx`

**Correcao adicional**: Usar `<a>` tag como fallback para garantir navegacao:

```tsx
<a
  href="/settings/chat-flows"
  onClick={(e) => {
    e.preventDefault();
    navigate("/settings/chat-flows");
  }}
  className="..."
>
  <ArrowLeft className="h-5 w-5" />
</a>
```

#### 5. Adicionar Explicacao de Uso dos Gatilhos

**Arquivo**: `src/pages/ChatFlowEditorPage.tsx` (Dialog de Gatilhos)

**Correcao**: Melhorar o texto explicativo no Dialog:

```tsx
<DialogDescription>
  <strong>Como funciona:</strong> Quando um cliente envia uma mensagem contendo 
  essas palavras-chave, este fluxo sera ativado automaticamente pelo chatbot.
  <br /><br />
  <strong>Palavras-chave:</strong> Termos curtos (ex: "carnaval", "promocao")
  <br />
  <strong>Frases exatas:</strong> Mensagens longas para match mais preciso
</DialogDescription>
```

---

### Resumo das Alteracoes

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `src/App.tsx:254` | Edicao | Remover `<Layout>` do ChatFlowEditorPage |
| `src/pages/ChatFlowEditorPage.tsx` | Edicao | Forcar refetch apos salvar gatilhos + melhorar UI do botao voltar + adicionar badge de keywords + melhorar texto explicativo |

### Como Usar os Gatilhos (Resposta ao Usuario)

Os gatilhos ja estao funcionando! Quando um cliente enviar uma mensagem no WhatsApp contendo:
- A palavra-chave "Carnaval"
- Ou a frase "Olá vim pelo email e gostaria de saber da promoção de pré carnaval"

O fluxo "TESTE" sera automaticamente ativado pelo chatbot IA, iniciando a coleta de dados conforme o fluxo configurado.

**Nao precisa fazer nada alem de:**
1. Configurar as palavras-chave
2. Ativar o fluxo (toggle "Ativo")
3. Garantir que o chatbot IA esteja ativo nas conversas
