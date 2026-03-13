

# Adicionar seletor de data no relatório diário da IA Governante

## O que será feito
Adicionar um **date picker** ao lado do botão "Enviar relatório agora" no dialog de edição de perfil. O usuário escolhe uma data e recebe o relatório completo daquele dia (00:00 às 23:59).

## Mudanças

### 1. Edge Function `ai-governor` (supabase/functions/ai-governor/index.ts)
- Aceitar novo parâmetro `report_date` (string ISO, ex: `"2026-03-12"`) no body
- Quando `report_date` é fornecido, calcular `since` = início do dia e `until` = fim do dia (23:59:59) daquela data
- Prioridade: `report_date` > `force_today` > comportamento padrão (ontem)

### 2. ProfileEditDialog (src/components/ProfileEditDialog.tsx)
- Adicionar state `reportDate` (Date | undefined)
- Adicionar um **Popover com Calendar** (componentes já existentes no projeto) acima ou ao lado do botão "Enviar relatório agora"
- Quando uma data é selecionada e o botão é clicado, enviar `{ report_date: "YYYY-MM-DD" }` para a edge function
- Se nenhuma data selecionada, manter comportamento atual (`force_today: true` = hoje)
- Label: "Relatório do dia:" com o date picker e botão de envio

### Layout
```text
┌─────────────────────────────────────┐
│ Relatório do dia:                   │
│ [📅 13/03/2026        ▼]           │
│ [✈ Enviar relatório do dia]        │
└─────────────────────────────────────┘
```

