

# Fix: Tela "Atualização importante" que aparece mesmo com navegador atualizado

## Problema Real
A tela "Atualização importante" **nao e** um problema de versao do navegador. Ela e o **ErrorBoundary** do React — aparece quando o app crasha por qualquer erro JavaScript. A mensagem e enganosa porque diz "versao antiga do sistema", mas na verdade esta escondendo um erro real.

O botao "Atualizar agora" faz hard refresh, mas se o erro persistir (ex.: chunk corrompido, import dinamico falhando, ou bug de runtime), o usuario fica preso nessa tela sem saber o que aconteceu.

## Solucao (2 mudancas)

### 1. Melhorar o ErrorBoundary para mostrar informacoes uteis
**Arquivo:** `src/components/AppErrorBoundary.tsx`

- Mudar o titulo de "Atualizacao importante" para algo mais honesto: **"Algo deu errado"**
- Mudar o texto explicativo para: "Ocorreu um erro inesperado. Tente recarregar a pagina."
- Adicionar botao **"Recarregar Pagina"** (reload simples, sem limpar tudo)
- Manter o botao "Limpar Cache e Atualizar" como opcao secundaria (hard refresh)
- Mostrar detalhes do erro em modo colapsado (para todos, nao so DEV) — isso ajuda o usuario a reportar o problema
- Adicionar um botao "Copiar erro" para facilitar o report

### 2. Adicionar tratamento de erro de chunk mais robusto
- No `componentDidCatch`, verificar se o erro e de chunk/import dinamico
- Se for erro de chunk, tentar reload automatico UMA vez (usando sessionStorage para controlar)
- Se nao for erro de chunk, mostrar a tela de erro melhorada

## Detalhes tecnicos

```text
AppErrorBoundary.tsx (reescrita da UI de erro):

1. Titulo: "Algo deu errado" (em vez de "Atualizacao importante")
2. Subtitulo: "Ocorreu um erro inesperado."
3. Botao primario: "Recarregar Pagina" (window.location.reload())
4. Botao secundario: "Limpar Cache e Atualizar" (hardRefresh)
5. Detalhes colapsaveis com nome do erro + stack trace resumido
6. Botao "Copiar erro" que copia error.message + stack para clipboard
7. Auto-reload para erros de chunk (1x apenas, controlado por sessionStorage)
```

## Impacto
- Zero regressao: ErrorBoundary continua capturando erros normalmente
- Melhora UX: usuario sabe que houve um erro real, nao acha que e problema de versao
- Facilita debug: erro visivel + copiavel
- Resolve loops: reload simples primeiro, hard refresh como opcao

