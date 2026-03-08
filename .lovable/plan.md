

# Checklist business_messages_config — Resultado da Auditoria

## A) Migration — Trigger `updated_at`

| Item | Status | Detalhe |
|------|--------|---------|
| Tabela existe | ✅ | 2 registros presentes |
| Função `update_updated_at_column()` existe | ✅ | Confirmada |
| **Trigger criada** | ❌ | **Não existe no banco** — migration não foi aplicada |

**Ação necessária:** Criar nova migration para aplicar o trigger. O arquivo da migration anterior existe no código mas não foi executado no banco.

```sql
DROP TRIGGER IF EXISTS update_business_messages_config_updated_at ON public.business_messages_config;
CREATE TRIGGER update_business_messages_config_updated_at
  BEFORE UPDATE ON public.business_messages_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

## B) UI — BusinessMessagesSection

| Item | Status | Detalhe |
|------|--------|---------|
| Bloquear salvar vazio | ✅ | `disabled={!isDirty \|\| isEmpty}` (linha 653) |
| Warning placeholders | ✅ | Alert aparece quando `{schedule}` ou `{next_open}` ausentes (linhas 625-648) |
| Restaurar Padrão | ✅ | Botão com defaults hardcoded corretos, desabilitado quando draft == default (linhas 658-666) |
| Persistência/refresh | ✅ | `useEffect` carrega do banco quando `messages` muda (linhas 567-573) |

## C) Edge Functions

| Item | Status | Detalhe |
|------|--------|---------|
| `ai-autopilot-chat` busca template | ✅ | `maybeSingle()` + fallback hardcoded (linhas 7454-7470) |
| Substituição `{schedule}` / `{next_open}` | ✅ | `.replace(/\{schedule\}/g, ...)` (linhas 7462-7464) |
| `redistribute-after-hours` busca template | ✅ | `maybeSingle()` + fallback (linhas 161-171) |
| Guard anti-perda no catch | ✅ | Re-add tag `pendente_retorno` (linhas 182-185+) |

## D) Resumo

**Único pendente: trigger `updated_at` não aplicada no banco.** Todo o resto está correto.

### Plano de execução

1. **Executar migration** — criar trigger `update_business_messages_config_updated_at` via ferramenta de migração
2. **Verificar** — query de confirmação pós-criação

Nenhum arquivo de código precisa ser alterado.

