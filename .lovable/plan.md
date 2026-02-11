

# Fix: Exportação do Relatório de Conversas

## Problema
O botão "Exportar CSV" do Relatório de Conversas reutiliza o hook `useExportCommercialConversationsCSV`, que chama 3 RPCs:
1. `get_commercial_conversations_kpis` (desnecessario)
2. `get_commercial_conversations_pivot` (desnecessario)  
3. `get_commercial_conversations_report` (unico necessario)

Se qualquer uma das 2 RPCs extras falhar, o export inteiro falha.

## Solucao
Criar um hook dedicado `useExportConversationsCSV` que chama APENAS a RPC de detalhes e gera um Excel simples com 1 aba ("Conversas") contendo os 20 campos solicitados.

## Mudancas

### 1. Novo arquivo: `src/hooks/useExportConversationsCSV.tsx`
- Chama apenas `get_commercial_conversations_report` (1 RPC)
- Gera Excel com 1 aba "Conversas" com as 20 colunas:
  - ID, Status, Nome, Email, Telefone, Data Entrada, Hora Entrada, Data Encerramento, Hora Encerramento, Tempo Espera, Duracao, Responsavel, Participantes, Grupo Responsavel, Total Interacoes, Origem, CSAT, Ticket, Tags, Tempo Espera pos Atribuicao, Primeira Mensagem
- Limite de 5000 registros
- Nome do arquivo: `relatorio_conversas_YYYY-MM-DD.xlsx`

### 2. Editar: `src/pages/ConversationsReport.tsx`
- Trocar import de `useExportCommercialConversationsCSV` para `useExportConversationsCSV`
- Nenhuma outra mudanca

## Detalhes tecnicos

```text
Hook novo: useExportConversationsCSV
  - 1 chamada RPC: get_commercial_conversations_report
  - Formata datas separadas (Data / Hora)
  - Formata duracoes em "Xh Ym Zs"
  - Auto-width nas colunas
  - BOM para compatibilidade Excel
  - Toast de sucesso/erro
```

## Impacto
- Zero regressao: hook antigo continua funcionando para Conversas Comerciais
- Novo hook serve apenas o Relatorio de Conversas
- 1 RPC ao inves de 3 = mais rapido e sem erro
