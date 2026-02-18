

## Adicionar Seletor de Gatilho no Builder V2

### Problema
No builder V2, o campo "Gatilho" na sidebar direita (aba Config) e apenas texto estático — mostra o valor atual mas nao permite alteracao. Diferente do V1, onde o usuario pode mudar o gatilho a qualquer momento.

### Solucao
Substituir o texto estático do gatilho por um Select editavel na sidebar direita do builder V2, reutilizando a mesma lista de trigger types e o hook `useUpdateEmailTemplateV2` que ja esta em uso na pagina.

### Alteracao

**Arquivo: `src/pages/EmailBuilderV2Page.tsx`**

1. Importar `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` (ja existem no projeto)
2. Na aba "Config" da sidebar direita (linhas 234-249), substituir o bloco de "Informacoes" que mostra o gatilho como texto estatico por um Select editavel
3. Ao mudar o valor, chamar `updateTemplate.mutate({ id, updates: { trigger_type: value } })` — mesmo padrao ja usado para Assunto e Preheader
4. Adicionar a lista de trigger types (mesma do `CreateTemplateV2Dialog`) como constante local ou importada

### Layout atualizado da sidebar Config

```text
Assunto:     [________________]
Preheader:   [________________]
---
Gatilho:     [Select v]       <-- novo (era texto)
Categoria:   transactional     (texto)
Versao:      v1                (texto)
```

### O que NAO muda
- CreateTemplateV2Dialog continua funcionando igual
- Assunto e Preheader continuam editaveis como estao
- Nenhuma alteracao de banco de dados
- Kill Switch, Shadow Mode, CSAT, distribuicao: nao afetados
