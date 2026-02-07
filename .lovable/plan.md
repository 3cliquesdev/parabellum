
# Plano: Correção de Condições Email_Opened/Email_Clicked com Email Node ID

## Resumo Executivo

O usuário forneceu **dois patches precisos** para corrigir as condições "Email Aberto" e "Email Clicado" que atualmente não funcionam porque:

1. **Frontend**: O editor usa um `Input` genérico para `condition_value` em vez de um dropdown que permite selecionar o nó de email anterior
2. **Backend**: O email do formulário não envia `playbook_node_id`, tornando impossível rastrear qual email acionou a condição

## Alterações Necessárias

### PATCH 1: PlaybookEditor.tsx (Frontend)

**Localização**: Linhas 920-931 (bloco "Standard condition value")

**Mudanças**:

1. **Adicionar helper function** `getUpstreamEmailNodes` (no topo do componente ou antes do export)
   - Percorre o grafo de edges para encontrar todos os nós de email anteriores
   - Retorna lista ordenada por posição vertical (ordem visual do fluxo)

2. **Substituir bloco condition_value** (linhas 920-931)
   - Detectar se condition_type é `email_opened` ou `email_clicked`
   - Se for: renderizar `<select>` dropdown com nós de email disponíveis, salvando em `email_node_id`
   - Se não for: manter `<Input>` para `condition_value` (comportamento atual)
   - Mostrar mensagens de ajuda quando:
     - Não há emails anteriores: "Nenhum email antes deste condition"
     - Dropdown vazio: "Selecione um email — sem email_node_id o backend retorna FALSE"

**Impacto**:
- Zero regressão: Condições não-email continuam funcionando igual
- Novas condições email_opened/email_clicked agora funcionam
- UX melhorada com lista de emails anteriores e validação

---

### PATCH 2: process-playbook-queue/index.ts (Backend)

**Localização**: Função `executeFormNode`, na chamada `supabase.functions.invoke('send-email')` (linhas 788-803)

**Mudança**:
- Adicionar `playbook_node_id: item.node_id` ao payload do `send-email`
- Isso garante que o email do formulário tenha rastreabilidade para condições futuras

**Impacto**:
- Zero regressão: Emails continuam sendo enviados normalmente
- Formulários agora aparecem na tabela `email_sends` com seu `playbook_node_id`
- Condições "Email Aberto" no formulário agora conseguem identificar qual email foi aberto

---

## Sequência de Implementação

```
┌─────────────────────────────────────────────┐
│ 1. PlaybookEditor.tsx                       │
│    └─ Adicionar helper getUpstreamEmailNodes│
│    └─ Substituir bloco condition_value      │
│       (permite seleção de email_node_id)    │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 2. process-playbook-queue/index.ts          │
│    └─ Adicionar playbook_node_id: item.node_id
│       ao invoke('send-email') do form       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│ 3. Deploy automático                        │
│    └─ Edge Function redeploy (backend)      │
│    └─ Frontend rebuild                      │
└─────────────────────────────────────────────┘
```

## Teste Esperado

**Fluxo de teste**:
1. Criar playbook: `Email → Condition(email_opened) → Ação`
2. No editor, verificar que dropdown de emails aparece na condição
3. Selecionar o nó de email na lista
4. Executar "🧪 Testar para Mim"
5. Abrir o email de teste
6. Verificar no backend:
   - `email_sends.playbook_node_id` = ID do nó email selecionado
   - `email_sends.opened_at` IS NOT NULL
   - Condição retorna `Result: true` (log)
7. Ação posterior ao condition executa com sucesso

---

## Benefícios & Zero Downtimes

| Aspecto | Status |
|---------|--------|
| Regressão | Nenhuma - funcionalidades existentes preservadas |
| Email tracking | Já funciona (Resend webhooks) → agora com node_id |
| Backward compatibility | Condições antigas continuam funcionando |
| UX | Dropdown guia o usuário (evita erros) |
| Documentação interna | Mensagens de ajuda no editor explicam requisitos |

---

## Nota de Design (Opcional)

O usuário mencionou uma **versão enterprise opcional**: auto-selecionar o último email upstream quando o user muda `condition_type` para `email_opened/clicked`. Isso evita deixar o dropdown vazio. Pode ser implementado como segunda fase se desejado (não bloqueia funcionalidade base).

