

# Plano: Corrigir Erro de Exportação do Relatório Comercial

## Problema Identificado

Ao exportar o relatório de conversas comerciais na versão publicada, aparece "Erro ao exportar relatório" sem detalhes.

### Causa Raiz

Analisando o código de `useExportCommercialConversationsCSV.tsx`, identifiquei **3 problemas**:

1. **Tratamento de erro incompleto**: Apenas `reportResult.error` é verificado, mas erros em `kpisResult` ou `pivotResult` são ignorados silenciosamente
2. **Mensagem de erro genérica**: O toast mostra apenas "Erro ao exportar relatório" sem contexto
3. **Sem logging adequado**: O `console.error` não inclui detalhes suficientes para diagnóstico

### Código Atual (Problema - Linhas 84-97)

```typescript
if (reportResult.error) throw reportResult.error;

const kpis: KPIData = kpisResult.data?.[0] || { /* defaults */ };
const pivotData: PivotRow[] = pivotResult.data || [];
```

**Problema**: Se `kpisResult.error` ou `pivotResult.error` existir, é ignorado e o código continua com dados vazios/parciais.

---

## Solução Proposta

### 1. Verificar TODOS os erros das queries paralelas

Antes de processar os dados, verificar se qualquer uma das 3 queries retornou erro:

```typescript
// Verificar TODOS os erros (KPIs, Pivot e Report)
if (kpisResult.error) {
  console.error("Erro KPIs:", kpisResult.error);
  throw new Error(`Erro ao buscar KPIs: ${kpisResult.error.message}`);
}
if (pivotResult.error) {
  console.error("Erro Pivot:", pivotResult.error);
  throw new Error(`Erro ao buscar Pivot: ${pivotResult.error.message}`);
}
if (reportResult.error) {
  console.error("Erro Report:", reportResult.error);
  throw new Error(`Erro ao buscar Relatório: ${reportResult.error.message}`);
}
```

### 2. Melhorar mensagem de erro no toast

Mostrar o motivo real do erro ao invés de mensagem genérica:

```typescript
} catch (error: any) {
  console.error("Erro ao exportar:", error);
  
  // Extrair mensagem de erro mais específica
  const errorMessage = error?.message || error?.details || "Erro desconhecido";
  
  toast.error("Erro ao exportar relatório", {
    description: errorMessage.length > 100 
      ? errorMessage.substring(0, 100) + "..." 
      : errorMessage,
  });
} finally {
```

### 3. Adicionar try-catch específico para geração do Excel

Separar erros de busca de dados vs erros de geração do arquivo:

```typescript
// Buscar dados
const [kpisResult, pivotResult, reportResult] = await Promise.all([...]);

// Verificar erros de busca
if (kpisResult.error || pivotResult.error || reportResult.error) {
  throw new Error("Erro ao buscar dados: " + 
    (kpisResult.error?.message || pivotResult.error?.message || reportResult.error?.message));
}

// Gerar Excel (try-catch separado)
try {
  const wb = XLSX.utils.book_new();
  // ... resto do código de geração
} catch (xlsxError) {
  console.error("Erro ao gerar Excel:", xlsxError);
  throw new Error("Erro ao gerar arquivo Excel");
}
```

---

## Alterações Detalhadas

### Arquivo: `src/hooks/useExportCommercialConversationsCSV.tsx`

**Linhas 82-102**: Adicionar verificação de erros completa

```typescript
// 🆕 Verificar TODOS os erros das queries paralelas
if (kpisResult.error) {
  console.error("[Export] Erro ao buscar KPIs:", kpisResult.error);
  throw new Error(`Erro ao buscar KPIs: ${kpisResult.error.message || 'Erro desconhecido'}`);
}

if (pivotResult.error) {
  console.error("[Export] Erro ao buscar Pivot:", pivotResult.error);
  throw new Error(`Erro ao buscar Pivot: ${pivotResult.error.message || 'Erro desconhecido'}`);
}

if (reportResult.error) {
  console.error("[Export] Erro ao buscar Relatório:", reportResult.error);
  throw new Error(`Erro ao buscar Relatório: ${reportResult.error.message || 'Erro desconhecido'}`);
}
```

**Linhas 254-260**: Melhorar catch com mensagem detalhada

```typescript
} catch (error: any) {
  console.error("[Export] Erro ao exportar:", error);
  
  // Extrair mensagem de erro mais específica
  const errorMessage = error?.message 
    || error?.details 
    || (typeof error === 'string' ? error : 'Erro desconhecido');
  
  toast.error("Erro ao exportar relatório", {
    description: errorMessage.length > 150 
      ? errorMessage.substring(0, 150) + "..." 
      : errorMessage,
  });
}
```

---

## Impacto

| Área | Impacto |
|------|---------|
| Diagnóstico | Melhorado - Erro real aparece no toast e console |
| UX | Melhorado - Usuário sabe qual parte falhou |
| Estabilidade | Melhorado - Não continua com dados parciais |
| Regressão | Zero - Apenas adiciona verificações, não remove lógica |

---

## Critérios de Aceite

| # | Cenário | Esperado |
|---|---------|----------|
| 1 | Erro na RPC KPIs | Toast mostra "Erro ao buscar KPIs: [motivo]" |
| 2 | Erro na RPC Pivot | Toast mostra "Erro ao buscar Pivot: [motivo]" |
| 3 | Erro na RPC Report | Toast mostra "Erro ao buscar Relatório: [motivo]" |
| 4 | Exportação bem sucedida | Toast verde com total de registros |
| 5 | Nenhum registro | Toast warning "Nenhum registro encontrado" |

---

## Seção Técnica

### Arquivo Modificado
`src/hooks/useExportCommercialConversationsCSV.tsx`

### Linhas Afetadas
- 82-102: Adicionar verificação de erros das 3 queries
- 254-260: Melhorar tratamento do catch

### Verificações Adicionais

Após implementar, testar nos cenários:
1. Exportar com filtros válidos → sucesso
2. Exportar período sem dados → aviso "Nenhum registro"
3. Simular erro (desconectar internet) → mensagem de erro clara

