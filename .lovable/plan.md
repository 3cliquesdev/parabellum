
# Correção: Mensagens WhatsApp com Alerta de Falha (Status Failed)

## Problema Identificado

Existem **477 mensagens** enviadas por agentes via WhatsApp marcadas com `status = 'failed'` no banco de dados. Isso faz o ícone de alerta (triangulo vermelho) aparecer na bolha da mensagem, assustando os atendentes.

**Causa raiz**: O webhook do Meta WhatsApp recebe callbacks com `status: "failed"` e o sistema simplesmente aceita sem:
1. Verificar se o status atual ja e superior (ex: `delivered` nao pode virar `failed`)
2. Capturar os detalhes do erro (`errors[].code`, `errors[].title`)
3. Exibir o motivo do erro ao usuario

Alem disso, muitas dessas mensagens possuem `external_id` (wamid) valido, o que indica que foram aceitas pelo WhatsApp mas falharam na entrega posterior (janela de 24h expirada, numero invalido, etc).

---

## Solucao em 3 Partes

### PARTE 1: Backend - Prevenir Downgrade de Status + Capturar Erros

**Arquivo**: `supabase/functions/meta-whatsapp-webhook/index.ts`

**Mudancas** (linhas 856-883):

1. Adicionar **hierarquia de status** para evitar downgrades:
   - Ordem: `sending(0) < sent(1) < delivered(2) < read(3)`
   - `failed` so aplica se status atual for `sending` ou `sent`
   - Se mensagem ja esta `delivered` ou `read`, ignorar `failed`

2. **Salvar detalhes do erro** do Meta no metadata:
   - `error_code`: codigo numerico do Meta (ex: 131026)
   - `error_title`: descricao do Meta (ex: "Message Undeliverable")

```text
Hierarquia de Status (nao permite downgrade):

sending  -->  sent  -->  delivered  -->  read
   \            \
    \----->  failed (so aceita se atual <= sent)
```

### PARTE 2: Frontend - Tooltip com Motivo do Erro

**Arquivo**: `src/components/MessageStatusIndicator.tsx`

**Mudancas**:
- Aceitar prop opcional `errorDetail` (string)
- Quando status = `failed`, envolver o icone com um Tooltip mostrando o motivo
- Fallback: "Falha no envio" quando nao ha detalhes

**Arquivo**: `src/components/inbox/MessageBubble.tsx`

**Mudancas**:
- Aceitar prop opcional `errorDetail`
- Passar para `MessageStatusIndicator`

**Arquivo**: `src/components/inbox/MessagesWithMedia.tsx`

**Mudancas**:
- Extrair `metadata.error_title` ou `metadata.error_code` da mensagem
- Passar como `errorDetail` para `MessageBubble`

### PARTE 3: Correcao de Dados Existentes (Opcional)

Uma query SQL para corrigir mensagens que tem `external_id` (foram aceitas pelo Meta) mas estao com `failed` sem detalhes de erro -- potencialmente falsos positivos que poderiam ser reclassificadas como `sent`.

Isso sera opcional e apresentado como sugestao apos as correcoes de codigo.

---

## Sequencia de Implementacao

```text
1. meta-whatsapp-webhook/index.ts
   - Adicionar STATUS_HIERARCHY
   - Prevenir downgrade de status
   - Capturar errors[] do Meta no metadata
   - Deploy automatico

2. MessageStatusIndicator.tsx
   - Adicionar prop errorDetail
   - Adicionar Tooltip no status failed

3. MessageBubble.tsx
   - Passar errorDetail prop

4. MessagesWithMedia.tsx
   - Extrair error info do metadata
   - Passar para MessageBubble
```

---

## Impacto

| Item | Status |
|------|--------|
| Regressao | Zero -- status sent/delivered/read continuam iguais |
| Mensagens futuras | Status `failed` so aplica quando correto |
| UX | Atendente ve o motivo do erro no tooltip |
| Dados antigos | 477 mensagens existentes mantem status (correcao manual opcional) |
| Performance | Nenhum impacto -- apenas 1 comparacao extra por status update |
