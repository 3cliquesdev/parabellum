

# Fix: Enter não funciona no textarea de "Palavras de saída"

## Problema

O `onChange` faz `.split("\n").map(trim).filter(Boolean)` — o `filter(Boolean)` **remove linhas vazias instantaneamente**. Quando o usuário pressiona Enter, a linha vazia criada é filtrada imediatamente e o array é re-joined sem ela, impedindo a criação de novas linhas.

## Solução

### `src/components/chat-flows/panels/BehaviorControlsSection.tsx` (linhas 174-183)

Usar estado local para o texto bruto do textarea, e só converter para array (com `filter(Boolean)`) no `onBlur` — não no `onChange`.

```tsx
// Adicionar useState para texto bruto
const [exitText, setExitText] = useState(
  (selectedNode.data.exit_keywords || []).join("\n")
);

// Sincronizar quando o node muda
useEffect(() => {
  setExitText((selectedNode.data.exit_keywords || []).join("\n"));
}, [selectedNode.id]);

// Textarea:
<Textarea
  onKeyDown={(e) => e.stopPropagation()}
  value={exitText}
  onChange={(e) => setExitText(e.target.value)}
  onBlur={() => {
    const keywords = exitText.split("\n").map(k => k.trim()).filter(Boolean);
    updateNodeData("exit_keywords", keywords);
  }}
  ...
/>
```

Mudança isolada no componente, zero regressão.

