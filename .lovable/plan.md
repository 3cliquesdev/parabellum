

# Auditoria Completa do ChatFlow Editor — Problemas de UX

## Diagnóstico

Analisei todos os 16 tipos de nós, seus painéis de propriedades e a experiência do usuário. O sistema **funciona tecnicamente**, mas tem sérios problemas de usabilidade para usuários novos.

---

## Problemas Encontrados

### 1. Variáveis de saída são inputs editáveis — deveria ser read-only
**Afeta:** ValidateCustomer, FetchOrder, VerifyOTP

Os campos como `customer_validated`, `order_found`, `customer_verified` são **text inputs** onde o usuário pode editar o nome da variável. Isso é confuso e perigoso — se o usuário mudar o nome, as condições e referências subsequentes quebram silenciosamente.

**Correção:** Trocar por **badges read-only com botão de copiar**. O usuário não precisa customizar esses nomes, apenas saber que existem.

### 2. "Salvar como variável" nos nós de coleta é um text input livre
**Afeta:** ask_name, ask_email, ask_phone, ask_cpf, ask_text, ask_options

O campo `save_as` é um input vazio com placeholder "nome_variavel". Um usuário novo não sabe o que colocar ali.

**Correção:** Trocar por um **Select dropdown** com sugestões pré-definidas por tipo de nó (`name`, `email`, `phone`, `cpf`, `response`, `choice`) + opção "Personalizado" para avançados.

### 3. "Variável de origem" no FetchOrder é text input livre
O campo `source_variable` deveria ser um **dropdown** listando as variáveis coletadas nos nós anteriores (ancestrais), similar ao que já existe no Condition node.

### 4. Tag no nó End requer UUID manual
Quando `end_action = "add_tag"`, o usuário precisa digitar o **nome** e o **UUID** da tag manualmente. Deveria ser um **dropdown** carregando tags do banco via `useTags()`.

### 5. Nó "ask_options" — campo "Valor" é confuso
Cada opção tem "Rótulo" e "Valor" em inputs separados. Usuários não entendem a diferença. O "Valor" deveria ser auto-gerado a partir do rótulo (slug), com opção de override.

### 6. Falta de descrições/tooltips nos blocos da sidebar
Os blocos da sidebar (Nome, Email, Condição, IA, etc.) não têm tooltip explicando o que cada um faz. Um usuário novo precisa adivinhar.

### 7. Nó Condition — modo "Personalizado..." sem contexto
A opção "✏️ Personalizado..." no seletor de campo não explica que o usuário precisa digitar um nome de variável do fluxo.

---

## Plano de Correção

### Arquivo 1: `ValidateCustomerPropertiesPanel.tsx`
- Remover os 3 inputs editáveis de variáveis de saída
- Substituir por badges read-only com ícone de copiar
- Manter o preview de variáveis como está (já é bom)

### Arquivo 2: `FetchOrderPropertiesPanel.tsx`
- Trocar `source_variable` por Select dropdown populado com variáveis ancestrais (receber `nodes`/`edges`/`selectedNodeId` como props)
- Remover os 3 inputs editáveis de variáveis de saída → badges read-only

### Arquivo 3: `VerifyCustomerOTPPropertiesPanel.tsx`
- Remover input editável de `save_verified_as` → badge read-only

### Arquivo 4: `ChatFlowEditor.tsx`
- **save_as:** Trocar Input por Select com opções sugeridas + "Personalizado"
- **ask_options:** Auto-gerar `value` a partir de `label` (slugify), esconder campo "Valor" (mostrar só com toggle avançado)
- **End node (add_tag):** Trocar inputs de tag_name/tag_id por Select dropdown usando `useTags()`
- **Sidebar blocos:** Adicionar tooltips nos `DraggableBlock` com descrição curta de cada nó
- Passar `nodes`/`edges`/`selectedNodeId` como props para FetchOrderPropertiesPanel

### Arquivo 5: `DraggableBlock` component
- Adicionar prop `tooltip` e envolver com `Tooltip` component

### Resumo de mudanças
- 5 arquivos alterados
- 0 mudanças no backend/motor de fluxos
- Foco 100% em UX: dropdowns, read-only, tooltips, auto-preenchimento

