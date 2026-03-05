

# Plano: Fix — Transfer type não reflete instantaneamente no nó

## Problema

Quando o usuário troca o "Tipo de transferência" no painel de propriedades, o `TransferPropertiesPanel` chama `updateNodeData` 5 vezes em sequência (transfer_type, department_id, department_name, agent_id, agent_name). Cada chamada no `ChatFlowEditor` faz `setSelectedNode({...selectedNode, data: {...selectedNode.data, [field]: value}})` usando o **mesmo** `selectedNode` do closure — resultado: só a última chamada prevalece e `transfer_type` é perdido.

## Solução

Alterar `updateNodeData` no `ChatFlowEditor.tsx` para usar o padrão funcional do `setSelectedNode`, garantindo que chamadas sequenciais acumulem corretamente:

```ts
setSelectedNode((prev) => prev ? {
  ...prev,
  data: { ...prev.data, [field]: value }
} : prev);
```

**Problema**: `setSelectedNode` é um `useState` simples (`const [selectedNode, setSelectedNode] = useState<Node | null>(null)`), que aceita updater function normalmente.

## Alteração

**Arquivo único**: `src/components/chat-flows/ChatFlowEditor.tsx` (linhas 286-289)

Trocar:
```ts
setSelectedNode({
  ...selectedNode,
  data: { ...selectedNode.data, [field]: value }
});
```

Por:
```ts
setSelectedNode((prev) =>
  prev && prev.id === selectedNode.id
    ? { ...prev, data: { ...prev.data, [field]: value } }
    : prev
);
```

## Impacto

- Zero regressão: todos os outros campos (label, message, save_as, options, etc.) também se beneficiam do fix
- O `setNodes` já usa o padrão funcional (callback), então já está correto
- Apenas o `setSelectedNode` estava usando valor direto do closure

