

## Plano: Corrigir templates nao aparecendo no PipelineTemplateDialog

### Problema
O `PipelineTemplateDialog` busca a instancia Meta filtrando por `status = 'active'`, mas o status real das instancias conectadas eh `'connected'` (definido pelo sync e pelo verify). Por isso `metaInstance` retorna `null`, `instanceId` fica `null`, e a query de templates nunca executa -- resultando em "Nenhum template ativo cadastrado".

### Correcao

**Arquivo: `src/components/pipeline/PipelineTemplateDialog.tsx`**

1. Alterar a query da instancia Meta (linha 53): trocar `.eq("status", "active")` por `.in("status", ["active", "connected"])` para cobrir ambos os status possiveis.

Isso eh a unica mudanca necessaria. Com o `instanceId` correto, a query de templates ja vai funcionar normalmente.

### Impacto
- Corrige o bug para todo o time
- Nenhuma mudanca de banco necessaria

