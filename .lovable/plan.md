

# Relatório Detalhado de Importação de Deals

## Problema
Hoje o relatório pós-importação só mostra "Criados" e "Erros". Se o usuário sobe 250 linhas e só 100 foram criadas, não sabe o que aconteceu com as outras 150.

## Solução

### Edge Function `import-deals`
Expandir o `ImportResult` para rastrear cada categoria:
- `deals_created` — deals inseridos com sucesso
- `contacts_created` — contatos novos criados
- `contacts_reused` — contatos já existentes reutilizados (novo)
- `skipped_no_title` — linhas sem título (novo)
- `skipped_duplicate` — linhas com `external_order_id` já existente no pipeline (novo, opcional)
- `vendor_not_found` — deals criados mas sem vendedor (nome não resolvido) (novo)
- `product_not_found` — deals criados mas sem produto (nome não resolvido) (novo)
- `errors` — array com detalhes de cada erro

### ImportDeals.tsx
- Passar `csvData.length` (total de linhas do CSV) junto com `mappedDeals.length` para o `importResult`
- Calcular `skipped_no_title = csvData.length - mappedDeals.length`

### ImportProgress.tsx (ou novo componente `ImportReport`)
Redesenhar o relatório pós-importação com seções claras:

```text
╔═══════════════════════════════════════════╗
║  📊 Relatório da Importação              ║
╠═══════════════════════════════════════════╣
║  Total de linhas no arquivo:  250        ║
╠═══════════════════════════════════════════╣
║  ✅ Deals criados:            180        ║
║  👤 Contatos criados:          45        ║
║  🔗 Contatos reutilizados:   135        ║
╠═══════════════════════════════════════════╣
║  ⚠️ Sem título (ignoradas):    20        ║
║  ⚠️ Vendedor não encontrado:   15        ║
║  ⚠️ Produto não encontrado:     8        ║
║  ❌ Erros:                     50        ║
╠═══════════════════════════════════════════╣
║  Total:  180 + 20 + 50 = 250  ✓         ║
╚═══════════════════════════════════════════╝
```

- Cada linha de aviso/erro é clicável para expandir detalhes
- A soma sempre bate com o total do arquivo
- Seção de erros mantém o scroll atual com linha + motivo

### Arquivos alterados
1. `supabase/functions/import-deals/index.ts` — expandir tracking de categorias
2. `src/pages/ImportDeals.tsx` — passar total do CSV, mapear novas categorias
3. `src/components/ImportProgress.tsx` — redesenhar com relatório completo

