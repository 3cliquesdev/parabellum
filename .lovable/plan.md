
## Correcao do Bug CSAT Guard - Limpeza de awaiting_rating

### Problema Identificado

O CSAT Guard no `meta-whatsapp-webhook` roda ANTES de qualquer logica de conversa/fluxo. Quando um cliente nao avalia e volta a entrar em contato:

```text
Mensagem 1: "Ola"
  -> CSAT Guard: extractRating("Ola") = null -> cai no fluxo normal
  -> Nova conversa criada -> Fluxo envia menu: "1. Pedidos 2. Sistema..."
  -> awaiting_rating da conversa ANTERIOR permanece TRUE

Mensagem 2: "1" (cliente escolhendo opcao do menu)
  -> CSAT Guard: extractRating("1") = 1 -> CAPTURA como rating!
  -> Salva 1 estrela na conversa anterior
  -> continue -> mensagem NUNCA chega ao fluxo da nova conversa
  -> Cliente fica sem resposta
```

### Solucao

Quando o CSAT Guard encontra uma conversa com `awaiting_rating = true` mas a mensagem NAO e um rating valido, **limpar o flag** imediatamente. Isso respeita a intencao do cliente de iniciar uma nova conversa.

### Arquivo alterado

**`supabase/functions/meta-whatsapp-webhook/index.ts`** (linhas 374-454)

Apos a verificacao `if (csatRating !== null)` (linha 377), adicionar um bloco `else` que:

1. Limpa `awaiting_rating = false` na conversa anterior
2. Loga a decisao
3. Permite que a mensagem siga para o fluxo normal (sem `continue`)

```typescript
if (csatConversation && csatConversation.awaiting_rating) {
  const csatRating = extractRating(messageContent);
  
  if (csatRating !== null) {
    // ... logica existente de captura de rating (sem alteracao) ...
    continue;
  } else {
    // Cliente enviou mensagem nao-numerica apos CSAT
    // Intencao clara: novo contato, nao avaliacao
    // Limpar flag para nao interceptar proximas mensagens
    console.log(`[meta-whatsapp-webhook] CSAT Guard: mensagem "${messageContent}" nao e rating. Limpando awaiting_rating da conversa ${csatConversation.id}`);
    await supabase
      .from("conversations")
      .update({ awaiting_rating: false })
      .eq("id", csatConversation.id);
    // NAO usar continue - deixar mensagem seguir para fluxo normal
  }
}
```

### Detalhes tecnicos

- Apenas 1 arquivo alterado: `meta-whatsapp-webhook/index.ts`
- Zero regressao: a logica de captura de rating valido (1-5) permanece identica
- A janela de 24h e a validacao strict (`^[1-5]$`) continuam ativas
- O flag e limpo apenas quando o cliente demonstra intencao de novo contato
- Conversas que recebem rating valido continuam funcionando normalmente
- As 20+ conversas com `awaiting_rating = true` sem rating serao limpas naturalmente conforme os clientes voltarem a entrar em contato
