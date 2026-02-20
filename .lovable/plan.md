

## Corrigir Loop Infinito na Exportacao de Relatorios

### Causa Raiz
O `PAGE_SIZE` esta configurado como 2.000, mas o backend tem um limite padrao de 1.000 linhas por chamada RPC. Quando a RPC retorna 1.000 linhas (cap do backend), o codigo interpreta como "ultima pagina" (1.000 < 2.000) e para prematuramente -- exportando apenas 1.000 de 4.440 linhas. O toast de progresso fica travado mostrando "Buscando dados... 1.000 de ~4.440".

### Solucao
Reduzir o `PAGE_SIZE` de 2.000 para 1.000 no utilitario `fetchAllRpcPages.ts`. Com isso:

- Cada chamada solicita 1.000 linhas (dentro do limite do backend)
- Se retornar exatamente 1.000, o loop sabe que ha mais paginas e continua
- Paginacao funciona corretamente: 1.000 + 1.000 + 1.000 + 1.000 + 440 = 4.440

### Arquivo Afetado

**`src/lib/fetchAllRpcPages.ts`**
- Unica alteracao: `PAGE_SIZE = 2000` para `PAGE_SIZE = 1000`

### Impacto
- Todas as exportacoes (Conversas, Comercial, Suporte, Tickets, Playbook) se beneficiam automaticamente
- Mais roundtrips (5 em vez de 3 para 4.440 linhas), mas cada um mais rapido e confiavel
- Nenhuma outra feature e afetada
- Zero risco de regressao

