
Analisei o projeto atual e sigo as regras da base de conhecimento.

Objetivo: corrigir de forma definitiva o upload dessa planilha (preview e publicado), para que os headers reais apareçam e o mapeamento manual funcione.

Diagnóstico confirmado
- O parser de Excel em `CSVUploader.tsx` ainda escolhe header pela “linha com mais células preenchidas” e só nas primeiras 10 linhas.
- Sua planilha tem estrutura de relatório (linhas de resumo/metadados antes da tabela), então o algoritmo captura uma linha errada (`Danielle Martins Rodrigues | 640 | ...`) como header.
- Resultado: o mapper recebe colunas inválidas e parece “não mapear”.

Plano de implementação (upgrade sem regressão)

1) Tornar a detecção de header robusta (arquivo `src/components/CSVUploader.tsx`)
- Substituir a estratégia atual por um score de cabeçalho, não só contagem de células.
- Escanear mais linhas iniciais (ex.: 50–100) em vez de 10.
- Critérios de score por linha:
  - + células textuais curtas (cara de nome de coluna)
  - + match com aliases conhecidos (email, nome, telefone, endereço, consultor, etc.)
  - - células majoritariamente numéricas/UUID/valores de dados
- Escolher a melhor linha por score; em empate, preferir a linha mais acima.

2) Melhorar coerência entre `headers` e `data`
- Garantir unicidade dos headers antes de montar os objetos de dados.
- Preservar mapeamento índice→coluna para não perder colunas duplicadas ou vazias.
- Manter fallback `coluna_n` apenas quando necessário, sem sobrescrever headers reais.

3) Fortalecer auto-mapeamento (`src/pages/ImportClients.tsx`)
- Reusar normalização com acentos/espaços.
- Dar prioridade a match exato e “startsWith” antes de “includes”, reduzindo falso positivo.
- Só auto-mapear quando header parecer semântico; caso contrário, deixar para seleção manual.

4) Guardrails de UX para diagnóstico rápido (`src/pages/ImportClients.tsx`)
- Mostrar “linha detectada como cabeçalho: X”.
- Mostrar aviso quando os headers detectados forem majoritariamente numéricos (“cabeçalho possivelmente incorreto”), com orientação para reenviar.
- Manter preview dos headers detectados (já existente).

5) Observabilidade temporária
- Logar:
  - intervalo escaneado,
  - top 3 linhas candidatas com score,
  - linha final escolhida,
  - headers finais.
- Isso permite validar no preview e publicado sem regressão.

Impacto e segurança de mudança
- Não altera fluxo de importação final nem regras de backend.
- Só melhora etapa de parsing/mapeamento no frontend.
- Mantém compatibilidade com CSV e XLSX já funcionais.

Teste de aceite (obrigatório)
1. Sua planilha atual deve exibir headers reais (ID, Nome, Email, etc.).
2. Dropdown deve listar colunas reais (não só “Não mapear”) em todos os campos.
3. Mapear manualmente Email/Nome e confirmar persistência do select.
4. Validar auto-map de campos principais (email, nome, telefone, endereço, consultor/id_consultor).
5. Regressão: template oficial continua funcionando igual.
6. Repetir no Preview e no Published.
