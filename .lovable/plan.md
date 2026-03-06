

# Fix: Transferência de Departamento Ignorada Quando Contato Tem Consultor

## Problema

No `meta-whatsapp-webhook`, quando o fluxo executa uma transferência do tipo `department` (ex: "Suporte Sistema"), o webhook verifica se o contato tem um `consultant_id` vinculado. Se tiver, **atribui a conversa ao consultor em vez do departamento destino**, ignorando completamente a decisão do fluxo.

Isso explica por que a Danielle Martins (consultora, Customer Success) recebe conversas que deveriam ir para "Suporte Sistema" — todos esses contatos têm ela como `consultant_id`.

Dados confirmados:
- 5 conversas recentes atribuídas à Danielle no departamento "Suporte Sistema"
- Todas têm `consultant_id = Danielle` no contato
- O nó de transferência no Master Flow é tipo `department`, não `consultant`

## Causa Raiz

Arquivo: `supabase/functions/meta-whatsapp-webhook/index.ts`, linhas ~987-991

```javascript
// ATUAL (bugado):
let consultantId = (isPreferredTransfer) 
  ? null
  : (contactConsultantData?.consultant_manually_removed && !isConsultantTransfer)
    ? null
    : (contactConsultantData?.consultant_id || null);
```

A lógica só anula o consultor quando `isPreferredTransfer = true` ou `consultant_manually_removed = true`. Para `department` transfers, o consultor é SEMPRE atribuído.

## Correção

```javascript
// CORRIGIDO:
let consultantId = (isConsultantTransfer)
  ? (contactConsultantData?.consultant_id || null)  // Só busca consultor se transfer_type=consultant
  : null;  // department, queue, preferred → vai para pool/departamento
```

Lógica simplificada:
- `transfer_type = consultant` → busca `consultant_id` do contato (respeitando `consultant_manually_removed` como fallback pro pool)
- `transfer_type = department` → vai para o pool do departamento (route-conversation distribui)
- `transfer_type = preferred` → usa preferred_agent/dept (já resolvido antes)
- `transfer_type = queue` → vai para fila

A lógica de `consultant_manually_removed` continua relevante apenas dentro do caso `isConsultantTransfer`:

```javascript
let consultantId: string | null = null;

if (isConsultantTransfer) {
  // Só busca consultor quando é transferência explícita para consultor
  consultantId = (contactConsultantData?.consultant_manually_removed)
    ? null  // Removido manualmente → vai para pool do departamento fallback
    : (contactConsultantData?.consultant_id || null);
  
  // Busca por email (fallback existente) continua aqui
}
// Para department/preferred/queue → consultantId = null → route-conversation distribui
```

## Impacto

- **Positivo:** Transferências `department` passam a respeitar o departamento configurado no fluxo
- **Zero regressão:** Transferências `consultant` continuam funcionando igual
- **Preferred:** Já era tratado separadamente, sem alteração
- **Nenhuma alteração frontend**

## Arquivo alterado

- `supabase/functions/meta-whatsapp-webhook/index.ts` (linhas ~982-1039)

