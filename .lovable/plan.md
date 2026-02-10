

# Hardening Complementar: 5 count queries restantes

## Descoberta

A busca final revelou 5 ocorrencias de `select('*', { count: 'exact', head: true })` que usavam aspas simples e nao foram capturadas no inventario anterior.

## Mudancas (cirurgicas, 100% seguras)

### 1. `src/components/settings/RAGOrchestratorWidget.tsx` (4 substituicoes)

- Linha 122: `.select('*', { count: 'exact', head: true })` -> `.select('id', { count: 'exact', head: true })`
- Linha 127: mesma troca
- Linha 133: mesma troca
- Linha 139: mesma troca

### 2. `src/hooks/useOnboardingFunnel.tsx` (1 substituicao)

- Linha 18: `.select('*', { count: 'exact', head: true })` -> `.select('id', { count: 'exact', head: true })`

## Seguranca

Identico as fases anteriores: `head: true` nao retorna body, apenas header `Content-Range`. Trocar `'*'` por `'id'` nao muda o resultado.

## Resultado apos aplicacao

Zero ocorrencias de `select("*")` ou `select('*')` em count queries (head:true) em todo o projeto.

As ~770 ocorrencias restantes de `select("*")` sem head:true sao queries que retornam dados reais e representam uma Fase 3 futura de hardening (cada uma precisa de campos explicitos especificos por tabela -- escopo muito maior).

## Arquivos modificados

| Arquivo | Tipo | Mudanca |
|---|---|---|
| `src/components/settings/RAGOrchestratorWidget.tsx` | EDIT | 4x `'*'` -> `'id'` |
| `src/hooks/useOnboardingFunnel.tsx` | EDIT | 1x `'*'` -> `'id'` |

