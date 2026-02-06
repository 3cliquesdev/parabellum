
# Correção: Variáveis de E-mail Não Substituídas

## Problema Identificado

**Sintoma:** O e-mail chegou com `{{primeiro_nome}}` não substituído (visível na imagem).

**Causa raiz:** Há um **desalinhamento** entre as variáveis oferecidas no editor de e-mail e as que são substituídas no backend.

### No Frontend (EmailBuilderV2 - mergeTags):
- `{{nome}}`
- `{{email}}`
- `{{telefone}}`
- `{{empresa}}`
- `{{primeiro_nome}}` ← Oferecido
- `{{sobrenome}}` ← Oferecido
- `{{data}}`
- `{{ticket_numero}}`
- `{{assunto}}`

### No Backend (process-playbook-queue linhas 440-447):
```typescript
htmlContent = (template.html_body || '')
  .replace(/\{\{first_name\}\}/gi, contact.first_name || 'Cliente')  // ✅ Inglês
  .replace(/\{\{last_name\}\}/gi, contact.last_name || '')           // ✅ Inglês
  .replace(/\{\{nome\}\}/gi, contact.first_name || 'Cliente')        // ✅ Português
  .replace(/\{\{email\}\}/gi, contact.email || '')
  .replace(/\{\{phone\}\}/gi, contact.phone || '')
  .replace(/\{\{document\}\}/gi, contact.document || '')
  .replace(/\{\{company\}\}/gi, contact.company || '');
```

**Variáveis FALTANDO no backend:**
- `{{primeiro_nome}}` ← NÃO substituída!
- `{{sobrenome}}` ← NÃO substituída!
- `{{telefone}}` ← NÃO substituída (só `{{phone}}`)
- `{{empresa}}` ← NÃO substituída (só `{{company}}`)
- `{{data}}` ← NÃO substituída

## Isso É Esperado Para Teste?

**NÃO.** O e-mail de teste deveria substituir as variáveis normalmente. O problema é que a variável `{{primeiro_nome}}` simplesmente não está na lista de substituições do backend.

## Solução

### Arquivo: `supabase/functions/process-playbook-queue/index.ts`

**Localização:** Linhas 440-447 (função `executeEmailNode`)

**Adicionar todas as variáveis em português** que o editor oferece:

```typescript
// 2. Substituir variáveis no template
const today = new Date().toLocaleDateString('pt-BR');
htmlContent = (template.html_body || '')
  // Variáveis em inglês (backward compatibility)
  .replace(/\{\{first_name\}\}/gi, contact.first_name || 'Cliente')
  .replace(/\{\{last_name\}\}/gi, contact.last_name || '')
  .replace(/\{\{phone\}\}/gi, contact.phone || '')
  .replace(/\{\{document\}\}/gi, contact.document || '')
  .replace(/\{\{company\}\}/gi, contact.company || '')
  // Variáveis em português (alinhadas com EmailBuilderV2)
  .replace(/\{\{nome\}\}/gi, contact.first_name || 'Cliente')
  .replace(/\{\{primeiro_nome\}\}/gi, contact.first_name || 'Cliente')  // ← NOVA
  .replace(/\{\{sobrenome\}\}/gi, contact.last_name || '')               // ← NOVA
  .replace(/\{\{email\}\}/gi, contact.email || '')
  .replace(/\{\{telefone\}\}/gi, contact.phone || '')                    // ← NOVA
  .replace(/\{\{empresa\}\}/gi, contact.company || '')                   // ← NOVA
  .replace(/\{\{data\}\}/gi, today);                                     // ← NOVA

// Também substituir no subject
subject = subject
  .replace(/\{\{primeiro_nome\}\}/gi, contact.first_name || 'Cliente')
  .replace(/\{\{nome\}\}/gi, contact.first_name || 'Cliente')
  .replace(/\{\{email\}\}/gi, contact.email || '');
```

## Arquivo a Modificar

| Arquivo | Ação | Detalhes |
|---------|------|----------|
| `supabase/functions/process-playbook-queue/index.ts` | **ATUALIZAR** | Adicionar variáveis `{{primeiro_nome}}`, `{{sobrenome}}`, `{{telefone}}`, `{{empresa}}`, `{{data}}` na função `executeEmailNode` |

## Impacto

| Aspecto | Avaliação |
|---------|-----------|
| Regressão | Nenhuma - adiciona variáveis novas sem remover existentes |
| Funcionalidade | E-mails de playbook (teste e produção) terão variáveis substituídas corretamente |
| Alinhamento | Frontend e backend usarão o mesmo conjunto de variáveis |

## Testes Após Correção

1. Criar template com `{{primeiro_nome}}` no corpo
2. Executar "🧪 Testar para Mim"
3. E-mail recebido deve ter o nome substituído (ex: "Olá, João!")
4. Testar também `{{sobrenome}}`, `{{telefone}}`, `{{empresa}}`, `{{data}}`
