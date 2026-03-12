

# Bug: Fluxo trava no nó `validate_customer` — Inbox para de funcionar

## Diagnóstico

Os logs confirmam o problema. Todas as conversas novas estão travadas no nó `1773317972333` (validate_customer):

```
📍 Content node: validate_customer 1773317972333 steps=1
✅ Created new state: ... (status=active, collected_data={})
```

**Causa raiz**: O loop de auto-traverse do Master Flow usa `NO_CONTENT = Set(['input', 'start', 'condition', 'condition_v2'])`. Como `validate_customer` **NÃO está nessa lista**, a travessia para ali. O estado é criado apontando para `validate_customer`, mas:

1. A lógica de validação (HTTP calls para Kiwify) **nunca executa** durante o start
2. O response handler (L4122) trata como nó genérico → retorna `response: null`
3. O webhook recebe null → nada é enviado ao WhatsApp
4. Na próxima mensagem, o activeState aponta para validate_customer, que processa e avança para condition, mas o fluxo já perdeu a primeira resposta

**Evidência**: 10 estados ativos no banco, TODOS presos em `current_node_id=1773317972333` com `collected_data={}`.

## Correção

### 1. Tratar `validate_customer` inline no loop de travessia (Master Flow + Manual Trigger)

Nos dois loops de auto-traverse (L3912 para Master Flow, L999 para Manual Trigger):
- Adicionar `validate_customer` ao set `NO_CONTENT`
- Dentro do loop, quando `node.type === 'validate_customer'`: executar a lógica de validação (buscar contato, chamar APIs Kiwify), salvar resultados no `collectedData`, e continuar traversando

Isso garante que: Start → validate_customer (executa validação) → condition (avalia `customer_validated`) → próximo nó (ai_response/message/transfer)

### 2. Handler de response para validate_customer (fallback)

Na seção de response do Master Flow (L4027+), adicionar handler específico para `validate_customer` caso a travessia pare ali (ex: erro na validação). Retornar `response: null` com flag para re-processar.

### 3. Limpar estados travados

Marcar os ~10 estados presos em `1773317972333` como `completed` para que as conversas possam reiniciar o fluxo na próxima mensagem.

## Arquivos

- `supabase/functions/process-chat-flow/index.ts` — loops de travessia + response handlers
- Migration SQL para limpar estados travados

## Impacto

- Corrige TODAS as conversas novas que entram no Master Flow com validate_customer no início
- A validação Kiwify executa antes da condição, permitindo roteamento correto (Onboarding, Carnaval, Comercial, etc.)
- Sem impacto em fluxos que não usam validate_customer no início

