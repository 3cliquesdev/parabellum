

# Plano: Fix Vazamento de Mensagem + Nó Errado no forceAIExit

## Problema 1: Mensagem "fake transfer" enviada ao WhatsApp

**Root cause**: Em `ai-autopilot-chat/index.ts`, a sequência é:
1. Linha 7847: Salva `assistantMessage` no banco
2. Linha 7991: **ENVIA para WhatsApp** via `send-meta-whatsapp`
3. Linha 8138: Só DEPOIS roda ESCAPE_PATTERNS

A mensagem "Vou te direcionar para nosso menu de atendimento..." já foi enviada e salva ANTES do escape check rodar. O check detecta, retorna `flowExit`, o webhook avança o flow — mas o texto já foi entregue ao cliente.

**Fix**: Mover o bloco de escape detection (linhas 8138-8229) para ANTES da inserção no banco (antes da linha 7847). A lógica fica:

```text
IA gera assistantMessage
  → ESCAPE CHECK (antes de salvar/enviar)
    → Se escape detectado: return flowExit/contractViolation (sem salvar, sem enviar)
    → Se ok: continua para salvar no banco + enviar WhatsApp
```

## Problema 2: Avança para o nó errado

Quando `forceAIExit=true`, o `path` fica `undefined`. Em `findNextNode`, isso faz com que pegue a edge sem `sourceHandle` (default), ignorando edges com handle `ai_exit`.

**Fix**: No `process-chat-flow`, quando `aiExitForced=true`, setar `path = 'ai_exit'` para que `findNextNode` procure primeiro uma edge com `sourceHandle='ai_exit'`. Se não existir, cairá no fallback (qualquer edge).

```typescript
// Linha ~2067, após o bloco de fallback_message:
if (aiExitForced) {
  path = 'ai_exit';
}
```

E ajustar `findNextNode` para tratar `ai_response` com path da mesma forma que trata edges com handle:

```typescript
// Na função findNextNode, antes do fallback genérico:
if (currentNode.type === 'ai_response' && path) {
  const handleEdge = edges.find(e => e.source === currentNode.id && e.sourceHandle === path);
  if (handleEdge) return flowDef.nodes.find(n => n.id === handleEdge.target);
  // Se não achou edge com handle, cai no fallback abaixo
}
```

## Arquivos impactados (2)

### 1. `ai-autopilot-chat/index.ts`
- **Mover** bloco escape detection + restriction validation (linhas 8138-8229) para ANTES da linha 7847 (salvar no banco)
- Quando escape detectado, retornar `flowExit`/`contractViolation` imediatamente — sem salvar mensagem, sem enviar WhatsApp
- Quando restriction violation detectada, substituir `assistantMessage` pelo fallback ANTES de salvar/enviar
- A mensagem de cache (linha 8232) precisa continuar DEPOIS do envio

### 2. `process-chat-flow/index.ts`
- Setar `path = 'ai_exit'` quando `aiExitForced=true` (linha ~2067)
- Adicionar bloco em `findNextNode` para `ai_response` com path (priorizar edge com handle `ai_exit`)

## Resultado

```text
Caso 1 (fake transfer):
  IA gera "Vou te direcionar..." → escape check ANTES de enviar → detecta → retorna flowExit
  → Webhook avança flow → cliente recebe menu REAL → zero vazamento

Caso 2 (nó errado):
  forceAIExit → path='ai_exit' → findNextNode pega edge com handle ai_exit → nó correto (transfer/menu)

Caso 3 ([[FLOW_EXIT]]):
  IA gera "[[FLOW_EXIT]]" → escape check detecta → retorna flowExit limpo → mesmo resultado
```

