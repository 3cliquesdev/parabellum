
Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico (por que “aparece sucesso” mas não baixa)
- A busca no backend está funcionando (retorna 200 e dados; exemplo: 991 registros).
- O problema está no “gatilho de download” no navegador:
  1) **Download fora do gesto do usuário**: o arquivo só é gerado depois de um `await` (RPC). Alguns navegadores/ambientes (principalmente em iframe/preview) bloqueiam downloads iniciados de forma “assíncrona”, mesmo usando `<a>.click()`.
  2) **`URL.revokeObjectURL(url)` imediato**: revogar o URL logo após o `click()` pode, em alguns browsers, cancelar/interromper o download antes de iniciar (especialmente em arquivos maiores).

Isso explica o comportamento: toast de sucesso aparece (o código termina), mas o arquivo não chega ao usuário.

## Objetivo do upgrade
Garantir download confiável:
- Preview (iframe)
- Published (janela normal)
- Com arquivo grande (centenas/milhares de linhas)

Sem afetar nada existente (zero regressão).

---

## Mudanças propostas (sem reimplementar nada; só upgrade)
### 1) Ajustar o hook `useExportConversationsCSV.tsx`
**Arquivo:** `src/hooks/useExportConversationsCSV.tsx`

**Alterações:**
1. **Não revogar o object URL imediatamente**  
   - Trocar `URL.revokeObjectURL(url)` por `setTimeout(() => URL.revokeObjectURL(url), 60_000)` (ou 30s).
   - Motivo: dá tempo do download iniciar/consumir o URL.

2. **Adicionar um “modo popup” opcional (mais confiável em iframe)**
   - O hook passa a aceitar um `downloadWindow?: Window | null`.
   - Se `downloadWindow` existir (aberto no clique do usuário), ao final do processamento:
     - `downloadWindow.location.href = url`
     - Opcional: escrever um HTML simples “Baixando…” (se quisermos melhorar UX).

3. **Fallback mantido (anchor click)**
   - Se não houver `downloadWindow`, manter o `a.click()` atual.
   - Mas com o `revokeObjectURL` atrasado.

**Resultado:** mesmo que o iframe bloqueie “download assíncrono”, o popup aberto no clique contorna isso.

---

### 2) Ajustar o clique do botão de export no `ConversationsReport.tsx`
**Arquivo:** `src/pages/ConversationsReport.tsx`

**Alterações:**
1. No `handleExport`, abrir a janela imediatamente (gesto do usuário):
   - `const w = window.open("", "_blank");`
2. Chamar `exportCSV(filters, { downloadWindow: w })`
3. Se `w` vier `null` (popup bloqueado):
   - Continuar com fallback (download por `<a>.click()`).
   - Mostrar toast mais claro: “Seu navegador bloqueou popups; permita popups para baixar no preview.”

---

## Correção adicional (pequena, mas importante): range de data duplicado
Hoje o `ConversationsReport` já faz `endDate: addDays(..., 1)` e o hook ainda soma +1 (`endExclusive`). Isso pode buscar **um dia a mais** do que o usuário selecionou.

Vou ajustar para:
- **No page**: `endDate` = `dateRange.to` (sem `addDays`)
- **No hook**: continuar fazendo `endExclusive +1` como já está (padrão correto “até o fim do dia”).

Impacto:
- Melhora precisão do filtro de data
- Não altera regras críticas do CRM (kill switch/shadow mode/etc.)
- Não mexe em dispatcher/flows/CSAT guard

---

## Plano de implementação (ordem)
1) Editar `src/hooks/useExportConversationsCSV.tsx`
   - Adicionar parâmetro opcional `downloadWindow`
   - Trocar revoke imediato por `setTimeout`
   - Se `downloadWindow` existir, redirecionar o popup para o `blob:` URL

2) Editar `src/pages/ConversationsReport.tsx`
   - Ajustar `handleExport` para abrir popup sincronamente e passar ao hook
   - Ajustar `endDate` para não somar +1

---

## Como vamos validar (obrigatório)
1) No preview: clicar “Exportar CSV” e confirmar que o navegador baixa/abre a planilha com dados.
2) No published: repetir o teste.
3) Testar com:
   - poucos registros (ex.: 10)
   - muitos registros (ex.: 991 como na imagem)
4) Conferir Console sem erros e sem warnings relevantes.
5) Confirmar que filtros (data/departamento/agente/status/canal/busca) continuam funcionando.

## Rollback rápido
- Se qualquer comportamento inesperado ocorrer, reverteremos para o download via `<a>.click()` apenas (mantendo o `setTimeout` no revoke, que é seguro), sem popup.

