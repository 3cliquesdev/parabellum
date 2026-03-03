
Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico (causa raiz provável do seu caso)
Pelo código atual, o bug antigo do `Select value=""` já foi corrigido.  
O sintoma que você descreveu agora (“só aparece Não mapear”) indica outro problema: os cabeçalhos (`csvHeaders`) estão chegando vazios no `ColumnMapper`.

Hoje o parser de Excel usa sempre `rows[0]` como header:
- se a planilha tiver linha de título, linha em branco, célula mesclada, ou header fora da 1ª linha, os headers ficam vazios;
- como o mapper filtra headers vazios, sobra apenas o item fixo “Não mapear”.

## Plano de correção (upgrade, sem regressão)

1) Fortalecer leitura de cabeçalho no `CSVUploader` (Excel e CSV)
- Detectar automaticamente a melhor linha de cabeçalho nas primeiras linhas (ex.: a com maior número de células preenchidas).
- Não assumir mais que header está em `rows[0]`.
- Ignorar colunas totalmente vazias.

2) Sanitizar e estabilizar nomes de colunas
- `trim` + normalização de espaços invisíveis.
- Se header vier vazio, gerar fallback técnico (`coluna_1`, `coluna_2`, etc.) para nunca quebrar o Select.
- Garantir unicidade de headers (sufixo em duplicados) para evitar colisões no mapeamento.

3) Garantir consistência entre header e dados
- Construir os objetos de linha usando os headers finais já saneados.
- Validar que `headers.length > 0` e pelo menos 1 coluna utilizável antes de liberar mapeamento.

4) UX defensiva no `ImportClients`
- Se nenhum header utilizável for detectado, mostrar aviso claro:
  “Não encontramos cabeçalhos válidos. Verifique se a planilha tem linha de títulos.”
- Exibir prévia dos headers detectados para diagnóstico rápido.

5) Observabilidade de debug (temporária)
- Logar: linha escolhida como header, headers finais e quantidade de colunas válidas.
- Isso acelera troubleshooting sem alterar regra de negócio.

## Arquivos a ajustar
- `src/components/CSVUploader.tsx` (principal)
- `src/pages/ImportClients.tsx` (mensagens/guardrails)
- (manter `ColumnMapper.tsx` como está, pois já está correto para Radix)

## Impacto, mitigação e rollback
- Impacto: melhora robustez de importação, sem alterar fluxo de import final.
- Mitigação: fallback de headers evita travamento mesmo com planilha imperfeita.
- Rollback rápido: reversão isolada em `CSVUploader.tsx` caso necessário.

## Testes obrigatórios
1. XLSX com header na 1ª linha (cenário normal).  
2. XLSX com 1ª linha vazia/título e header na 2ª/3ª linha.  
3. XLSX com colunas vazias no fim.  
4. XLSX com headers duplicados.  
5. CSV com `;` e com `,`.  
6. Verificar que dropdown mostra colunas reais e permite mapear manualmente.  
7. Importar em `update_mapped` e confirmar inserts/updates no backend.  
8. Regressão: fluxo atual continua funcionando igual no preview e publicado.
