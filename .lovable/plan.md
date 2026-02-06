
# Correção Urgente: Edge Function `form-public-api` Não Deployada

## Diagnóstico

**O problema**: A edge function `form-public-api` existe no código mas **NÃO está deployada** no Lovable Cloud, causando erro 404 quando usuários públicos tentam acessar qualquer formulário.

### Fluxo do Erro
1. Usuário acessa `/f/{formId}` ou `/public/form/{formId}`
2. `PublicFormV2.tsx` chama hook `usePublicFormSchema(formId)`
3. Hook faz `fetch()` para `${SUPABASE_URL}/functions/v1/form-public-api/{formId}/schema`
4. Lovable Cloud retorna **404 - Function not found** (função não deployada)
5. Hook retorna `null` quando status é 404
6. `PublicFormV2` linha 356: `if (!isPreview && !publicFormData)` renderiza "Formulário não encontrado"

### Evidências
- Teste direto da edge function retornou: `"code":"NOT_FOUND","message":"Requested function was not found"`
- Logs da função: vazios (nunca foi executada)
- Código existe em `supabase/functions/form-public-api/index.ts`

---

## Impacto

- **TODOS** os formulários públicos estão quebrados
- Links como `/f/dc9c1465-...` ou `/public/form/...` não funcionam
- Perda de leads/clientes desde que a função deixou de estar deployada (ou nunca foi)

---

## Solução

A correção é simples: **deployar a edge function**.

### Ação Única

```
Deploy da edge function "form-public-api"
```

O código já está correto e funcional - apenas precisa ser deployado no Lovable Cloud.

---

## Verificação Pós-Deploy

Após deploy, testar:

1. **Endpoint direto**:
   ```
   GET /functions/v1/form-public-api/dc9c1465-03ea-485f-a687-341f71c18ecd/schema
   ```
   Deve retornar JSON com id, name, title, description, schema

2. **UI pública**:
   - Acessar `/f/dc9c1465-03ea-485f-a687-341f71c18ecd` em janela anônima
   - Formulário deve renderizar normalmente

---

## Nota Técnica

A edge function `form-public-api` é o **gateway público** para formulários. Ela:
- Busca schema do formulário (sem autenticação)
- Valida que o form está ativo (`is_active = true`)
- Retorna estrutura para renderização no frontend

Sem ela deployada, nenhum formulário público funciona.
