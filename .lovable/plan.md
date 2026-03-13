

# Produtos Kiwify não aparecem no contexto da IA

## Diagnóstico

A lógica atual **NÃO** informa à IA quais produtos/serviços digitais o cliente comprou. Eis o que acontece:

1. **Triagem silenciosa** (linha ~2788): Quando o contato é validado via Kiwify, os produtos comprados são coletados (`product_name` dos eventos `paid/order_approved`) e salvos apenas como **nota interna** na tabela `interactions` — ex: `"✅ Cliente identificado via autopilot inline Kiwify. Produtos: Uni 3 Cliques, Híbrido"`.

2. **System Prompt da IA** (linha ~6717): O "Contexto do Cliente" enviado à IA contém nome, status, email, telefone, CPF, organização, consultor, vendedor e tags — mas **nenhum campo de produtos comprados**.

3. **Resultado**: A IA não sabe quais cursos, mentorias ou assinaturas o cliente comprou. Não consegue contextualizar atendimento, nem diferenciar entre um cliente de "Uni 3 Cliques" vs "Shopee Creation".

## Plano de Correção

### 1. Buscar produtos Kiwify do contato (ai-autopilot-chat)
Após a triagem silenciosa, buscar os produtos comprados do contato via `kiwify_events` (usando phone/email). Criar uma variável `customerProducts` com a lista de nomes de produtos únicos.

Isso já é parcialmente feito na triagem (linha 2788), mas o resultado é descartado. Precisamos:
- Armazenar o array `products` em uma variável acessível ao prompt
- Para contatos já validados (`kiwify_validated=true`), fazer a query de produtos separadamente (hoje pula a triagem inteira)

### 2. Injetar produtos no System Prompt
No "Contexto do Cliente" (linha ~6717), adicionar:
```
- Produtos/Serviços contratados: ${customerProducts.join(', ') || 'Nenhum identificado'}
```

### 3. Adicionar instrução contextual ao prompt
Após o contexto do cliente, adicionar instrução para a IA usar essa informação:
```
Os "Produtos/Serviços contratados" são produtos DIGITAIS (cursos, mentorias, assinaturas) 
que o cliente COMPROU. Use essa informação para personalizar o atendimento e contextualizar 
respostas sobre acesso, conteúdo e suporte dos produtos específicos do cliente.
```

### Arquivo alterado
- `supabase/functions/ai-autopilot-chat/index.ts`
  - Após triagem (~linha 2870): persistir `customerProducts` array
  - Para `kiwify_validated=true` (~linha 2872): buscar produtos via query
  - No system prompt (~linha 6727): injetar lista de produtos

