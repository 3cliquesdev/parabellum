
# Correção: Usar URL Publicada no Link do Formulário do Playbook

## Problema Identificado

O backend está usando a **URL incorreta** para gerar links de formulários em playbooks:

**Código Atual (linha 764):**
```typescript
const publicFormUrl = `${Deno.env.get('PUBLIC_SITE_URL') || 'https://lovable.app'}/public-form/${formId}?...`;
```

**Problemas:**
1. Usa secret `PUBLIC_SITE_URL` que **não existe** → fallback para `https://lovable.app` (errado)
2. Rota incorreta: `/public-form/` deveria ser `/f/`
3. Não usa `FRONTEND_URL` que já está configurado como secret

## Solução

Usar o secret `FRONTEND_URL` (que já existe e contém `https://nexxoai.lovable.app`) e corrigir a rota:

**Arquivo:** `supabase/functions/process-playbook-queue/index.ts` (linha 764)

**Mudança:**
```typescript
// Antes:
const publicFormUrl = `${Deno.env.get('PUBLIC_SITE_URL') || 'https://lovable.app'}/public-form/${formId}?execution_id=${execution.id}&contact_id=${contact.id}`;

// Depois:
const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://nexxoai.lovable.app';
const publicFormUrl = `${frontendUrl}/f/${formId}?execution_id=${execution.id}&contact_id=${contact.id}`;
```

## Resultado

| Item | Antes | Depois |
|------|-------|--------|
| URL gerada | `https://lovable.app/public-form/abc123?...` | `https://nexxoai.lovable.app/f/abc123?...` |
| Secret usado | `PUBLIC_SITE_URL` (não existe) | `FRONTEND_URL` (existente) |
| Rota | `/public-form/` | `/f/` |

## Impacto

- ✅ **Zero regressão**: corrige funcionalidade quebrada
- ✅ **Alinhamento**: usa mesmo padrão de URLs publicadas do sistema
- ✅ **Confiabilidade**: sempre usa `FRONTEND_URL` configurado

## Teste Esperado Após Correção

1. Executar "🧪 Testar para Mim" em playbook com nó de formulário
2. Email recebido com link do tipo: `https://nexxoai.lovable.app/f/{formId}?execution_id=...`
3. Clicar no link deve abrir o formulário na página correta
4. Formulário deve funcionar e salvar as respostas
