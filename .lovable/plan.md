

# Ajustes finos: Transferência para Consultor

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Estado Atual

A implementação core já está feita (TransferPropertiesPanel, TransferNode, webhook, process-chat-flow). Faltam apenas **2 refinamentos de UI** que o usuário pediu:

## Mudanças

### 1. TransferNode.tsx — Mostrar fallback dept abaixo do badge "Meu Consultor"

Quando `transfer_type === "consultant"` e `department_name` existe, exibir um segundo badge menor: `"Fallback: {department_name}"`. Ajuda na leitura do canvas.

### 2. TransferPropertiesPanel.tsx — Warning se dept fallback não selecionado

Quando `transfer_type === "consultant"` e `department_id` está vazio, mostrar um aviso visual (texto vermelho/amber) pedindo para selecionar o departamento fallback. Isso reforça a obrigatoriedade sem bloquear o canvas (validação visual).

## O que NÃO precisa mudar

- **Webhook** (`meta-whatsapp-webhook`): já trata `consultant_manually_removed` corretamente (linhas 930-936) — se removido manualmente E não é transfer consultant, pula; se é transfer consultant, tenta consultor mas respeita removed → pool.
- **process-chat-flow**: já passa `transferType: node.data?.transfer_type` em todos os pontos de saída.
- **Lógica de fallback**: já usa `DEPT_SUPORTE_FALLBACK` quando `departmentId` não vem do flow.

## Impacto
- Zero regressão — apenas ajustes visuais no canvas
- Tipos department/agent/queue não são afetados

