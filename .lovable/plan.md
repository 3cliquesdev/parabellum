

# Diagnóstico e Ajustes no Relatório de Conversas Comerciais

## O que está acontecendo

Analisei os dados do departamento **Comercial - Nacional** em março/2026:

| Situação | Qtd | Explicação |
|---|---|---|
| **Não atribuído** | 31 | Conversas transferidas pelo fluxo ao departamento, mas nenhum agente pegou. Passaram pelo ciclo de inatividade e foram encerradas automaticamente pelo bot. |
| **Danielle Martins** | 1 | Atribuição manual (ela se atribuiu ou foi atribuída manualmente) |
| **Pamela Vitória** | 1 | Idem |

As 31 conversas "não atribuídas" foram **100% atendidas pelo bot** (mensagens do fluxo). Nenhum agente humano participou. O dispatch tentou atribuir (204 jobs completados no mês) mas para essas conversas específicas não encontrou agente online no departamento.

**O relatório está mostrando dados corretos.** O problema real é que o departamento Comercial - Nacional não tem agentes disponíveis durante esses horários.

## Problemas encontrados no relatório

### 1. Timeout ao abrir sem filtro de departamento
A RPC `get_commercial_conversations_kpis` retorna erro 500 ("statement timeout") quando chamada sem `p_department_id`. Isso acontece porque o `LEFT JOIN` na tabela `messages` para calcular `first_agent_msg` faz um scan pesado em todas as conversas.

### 2. Contagem de "interações" inclui mensagens do bot como "agente"
As mensagens do fluxo são enviadas com `sender_type = 'user'` e `sender_id = NULL`, inflando a contagem de interações e o cálculo de tempo de espera.

### 3. "Participantes" sempre vazio para conversas bot-only
A coluna "Participantes" fica vazia porque tenta fazer JOIN com `profiles` usando `sender_id`, que é NULL para mensagens do bot.

## Plano de correção

### Correção 1: Otimizar RPC de KPIs para evitar timeout
Reescrever `get_commercial_conversations_kpis` usando subqueries indexadas em vez de `LEFT JOIN` na tabela messages completa. Adicionar índice parcial se necessário.

### Correção 2: Distinguir mensagens de bot vs agente humano
Ajustar as RPCs (`kpis`, `report`, `pivot`) para considerar como "agente" apenas mensagens com `sender_id IS NOT NULL` (bot envia com `sender_id = NULL`). Isso corrige:
- O cálculo de tempo de espera (FRT) - só conta quando humano responde
- A contagem de interações - separa bot de humano
- O campo "Responsável" - mostra "Bot (Fluxo)" em vez de "Não atribuído" quando houve interação do bot

### Correção 3: Melhorar o campo assigned_agent_name
Alterar a lógica do `assigned_agent_name` na RPC `get_commercial_conversations_report` para mostrar:
- Nome do agente (se `assigned_to` preenchido)
- "IA (Autopilot/Copilot)" (se ai_mode ativo)
- "Bot (Fluxo)" (se houve mensagens do fluxo mas nenhum humano)
- "Não atribuído" (se realmente ninguém interagiu)

### Arquivos alterados
- 1 migration SQL: otimizar `get_commercial_conversations_kpis`, `get_commercial_conversations_report` e `get_commercial_conversations_pivot`

