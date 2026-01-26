
## Plano de Correção: 10 Bugs Reportados

### Resumo dos Problemas Identificados

| # | Bug | Causa Raiz | Impacto |
|---|-----|------------|---------|
| 1 | Atribuições aleatórias | Usuários com login mas sem role válido (admin, manager) sendo incluídos na distribuição | Alto |
| 2 | Envio inicial de 2 mensagens | Conflito entre optimistic update e realtime subscription | Médio |
| 3 | Conversas perdendo atribuições | Trigger `redistribute_on_agent_offline` devolvendo conversas quando status muda | Alto |
| 4 | Link comercial não redireciona | Link quebrado ou handler de navegação faltando | Médio |
| 5 | Trocando palavras de envio | Possivelmente autocorreção ou race condition | Baixo |
| 6 | Não conseguem ficar offline | Falha no `go-offline-manual` ou UI bloqueada | Alto |
| 7 | Pesquisar tags (scroll) | Campo de busca existe mas pode não estar visível | Baixo |
| 8 | Mensagem marcada não relacionada | Funcionalidade de quote/reply não implementada para WhatsApp | Médio |
| 9 | Velocidade de áudio | AudioPlayer não tem controle de playbackRate | Médio |
| 10 | Pesquisa de conversas não funciona | Filtro de search não aplicado corretamente | Médio |

---

### 1. Atribuições Aleatórias

**Diagnóstico:**
O `route-conversation` e `distribute-pending-conversations` buscam agentes online por roles (`support_agent`, `sales_rep`), mas podem estar pegando usuários com outros roles (admin, manager) que têm login mas não devem atender diretamente.

**Causa identificada no código:**
- `distribute-pending-conversations` linha 78-80: Apenas `support_agent` e `sales_rep` estão em `DISTRIBUTION_ALLOWED_ROLES`
- MAS: A query de `profiles.availability_status = 'online'` pode retornar qualquer usuário online antes do filtro de roles ser aplicado

**Solução:**
```typescript
// distribute-pending-conversations/index.ts
// Adicionar verificação explícita de que o role existe ANTES de atribuir

// Linha ~105: Já existe verificação, mas precisamos garantir que onlineAgents
// só contenha usuários com roles em DISTRIBUTION_ALLOWED_ROLES

// Modificar a query para fazer o JOIN correto:
const { data: onlineAgents } = await supabaseClient
  .from('profiles')
  .select(`
    id, 
    full_name,
    user_roles!inner(role)
  `)
  .eq('availability_status', 'online')
  .in('user_roles.role', DISTRIBUTION_ALLOWED_ROLES);
```

**Arquivos a modificar:**
- `supabase/functions/distribute-pending-conversations/index.ts`
- `supabase/functions/route-conversation/index.ts`

---

### 2. Envio Inicial de 2 Mensagens

**Diagnóstico:**
O `useSendMessage` faz optimistic update (mensagem aparece imediatamente com ID temporário), e depois o realtime subscription recebe o INSERT real. Se a lógica de substituição não funcionar, aparecem 2 mensagens.

**Causa identificada no código:**
- `useMessages.tsx` linha 232-249: Cria mensagem otimista com `id: temp-${Date.now()}`
- `useMessages.tsx` linha 64-83: Realtime tenta substituir mensagem temp pela real, mas a comparação usa `content` e `sender_id` que podem não bater exatamente

**Solução:**
```typescript
// useMessages.tsx - Melhorar detecção de duplicata

// Adicionar timestamp no identificador temporário para matching mais preciso
const optimisticMessage = {
  id: `temp-${Date.now()}-${newMessage.content.substring(0, 20)}`,
  _tempTimestamp: Date.now(), // Marker para identificação
  // ...
};

// No realtime handler, verificar por timestamp range (2 segundos)
const tempIndex = old.findIndex(m => 
  m.id?.startsWith('temp-') && 
  m.content === newMessage.content &&
  m.sender_id === newMessage.sender_id &&
  Math.abs(new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()) < 5000
);
```

**Arquivos a modificar:**
- `src/hooks/useMessages.tsx`

---

### 3. Conversas Perdendo Atribuições a Cada Atualização

**Diagnóstico:**
O trigger `redistribute_on_agent_offline` devolve conversas para a IA quando o status muda de `online` para `offline/busy`. Se houver atualizações frequentes no profile, isso pode disparar redistribuição indevida.

**Causa identificada:**
- Migration `20260114045217`: Trigger dispara em QUALQUER mudança de `availability_status`
- Se o agente oscila entre status (ex: navegando entre abas), conversas são redistribuídas

**Solução:**
```sql
-- Adicionar debounce no trigger via verificação de timestamp
CREATE OR REPLACE FUNCTION redistribute_on_agent_offline()
RETURNS TRIGGER AS $$
BEGIN
  -- Só redistribuir se mudança foi há mais de 30 segundos (evitar oscilações)
  IF OLD.availability_status = 'online' 
     AND NEW.availability_status != 'online' 
     AND NEW.manual_offline = true  -- Apenas se foi offline MANUAL
  THEN
    UPDATE conversations
    SET assigned_to = NULL, previous_agent_id = OLD.id, ai_mode = 'autopilot'
    WHERE assigned_to = OLD.id AND status = 'open';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Arquivos a modificar:**
- Nova migration SQL para corrigir trigger

---

### 4. Link de Compra do Comercial Não Redireciona

**Diagnóstico:**
Precisamos identificar onde esse link está sendo usado. Pode ser:
- Link no botão de CTA que usa `onClick` sem navegação
- Link com `target="_blank"` que está sendo bloqueado
- URL inválida ou dinâmica que não está sendo resolvida

**Ação necessária:**
Preciso de mais contexto: Onde exatamente esse link aparece? (Chat flow? Mensagem automática? Widget?)

**Possível solução:**
Se for um botão de ação em mensagem:
```typescript
// Garantir que links externos usem window.open corretamente
const handleExternalLink = (url: string) => {
  if (url.startsWith('http')) {
    window.open(url, '_blank', 'noopener,noreferrer');
  } else {
    navigate(url);
  }
};
```

---

### 5. Trocando Palavras de Envio

**Diagnóstico:**
Sem mais contexto, pode ser:
- Autocorreção do navegador/teclado
- Race condition entre digitação e envio
- Problema de encoding de caracteres especiais

**Ação necessária:**
Preciso de exemplo específico: Qual palavra foi digitada e qual apareceu?

---

### 6. Não Conseguem Ficar Offline

**Diagnóstico:**
O fluxo de "ficar offline" passa por:
1. UI clica no botão de status
2. Abre `OfflineConfirmationDialog`
3. Chama `go-offline-manual` edge function
4. Atualiza `profiles.availability_status = 'offline'`

**Causa possível:**
- Dialog não está abrindo
- Edge function retornando erro silencioso
- Botão desabilitado por alguma condição

**Solução:**
```typescript
// Adicionar logs e tratamento de erro no handler de offline
const handleGoOffline = async () => {
  console.log('[Offline] Starting offline process...');
  
  try {
    const { data, error } = await supabase.functions.invoke('go-offline-manual', {
      body: { agentId: user.id }
    });
    
    if (error) {
      console.error('[Offline] Error:', error);
      toast.error('Erro ao ficar offline: ' + error.message);
      return;
    }
    
    console.log('[Offline] Success:', data);
    toast.success('Você está offline');
  } catch (err) {
    console.error('[Offline] Exception:', err);
    toast.error('Erro inesperado ao ficar offline');
  }
};
```

**Arquivos a investigar:**
- `src/hooks/useManageAvailabilityStatus.tsx`
- `supabase/functions/go-offline-manual/index.ts`

---

### 7. Pesquisar Tags - Scroll Necessário

**Diagnóstico:**
O campo de busca de tags JÁ EXISTE em `InboxSidebar.tsx` (linha 481-487), mas está dentro do `Collapsible` de tags que pode estar colapsado por padrão.

**Causa:**
- `tagsOpen` inicia como `false` (linha 280)
- Usuário precisa expandir a seção para ver o campo de busca

**Solução:**
```typescript
// InboxSidebar.tsx - Mover campo de busca para fora do collapsible
// OU adicionar ícone de busca no header do collapsible

// Opção 1: Abrir automaticamente se há muitas tags
const [tagsOpen, setTagsOpen] = useState((tags?.length || 0) > 10);

// Opção 2: Adicionar busca inline no trigger
<CollapsibleTrigger className="flex items-center justify-between w-full">
  <span>Tags</span>
  <div className="flex items-center gap-2">
    <Input 
      placeholder="Buscar..." 
      className="h-6 w-24 text-xs"
      onClick={(e) => e.stopPropagation()}
      // ...
    />
    <ChevronDown />
  </div>
</CollapsibleTrigger>
```

**Arquivos a modificar:**
- `src/components/inbox/InboxSidebar.tsx`

---

### 8. Mensagem Marcada (Quote/Reply) Não Relacionada

**Diagnóstico:**
Quando cliente marca/responde uma mensagem específica no WhatsApp, a funcionalidade de "quoted message" precisa ser implementada para mostrar qual mensagem está sendo respondida.

**Causa:**
O webhook do WhatsApp recebe `context.quoted_message_id`, mas não está sendo salvo/exibido.

**Solução:**
```typescript
// 1. Adicionar campo quoted_message_id na tabela messages
ALTER TABLE messages ADD COLUMN quoted_message_id UUID REFERENCES messages(id);

// 2. No handle-whatsapp-event, salvar o context
const quotedMessageId = message.context?.quoted_message_id;
if (quotedMessageId) {
  // Buscar mensagem original pelo external_id
  const { data: quotedMsg } = await supabase
    .from('messages')
    .select('id')
    .eq('external_id', quotedMessageId)
    .single();
  
  messageData.quoted_message_id = quotedMsg?.id;
}

// 3. Na UI, exibir a mensagem citada
{message.quoted_message_id && (
  <QuotedMessagePreview messageId={message.quoted_message_id} />
)}
```

**Arquivos a modificar:**
- Nova migration para `quoted_message_id`
- `supabase/functions/handle-whatsapp-event/index.ts`
- `src/components/inbox/MessageBubble.tsx`

---

### 9. Velocidade de Áudio

**Diagnóstico:**
O `AudioPlayer.tsx` não tem controle de `playbackRate`. Precisa adicionar botão de velocidade.

**Solução:**
```typescript
// AudioPlayer.tsx - Adicionar controle de velocidade

const [playbackRate, setPlaybackRate] = useState(1.0);
const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

const cycleSpeed = useCallback(() => {
  const audio = audioRef.current;
  if (!audio) return;
  
  const currentIndex = SPEED_OPTIONS.indexOf(playbackRate);
  const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
  const newRate = SPEED_OPTIONS[nextIndex];
  
  audio.playbackRate = newRate;
  setPlaybackRate(newRate);
}, [playbackRate]);

// No useEffect de setup do audio
useEffect(() => {
  const audio = audioRef.current;
  if (audio) {
    audio.playbackRate = playbackRate;
  }
}, [playbackRate]);

// Botão na UI
<Button
  variant="ghost"
  size="sm"
  onClick={cycleSpeed}
  className="shrink-0 h-7 px-2 text-xs font-mono"
  aria-label="Playback speed"
>
  {playbackRate}x
</Button>
```

**Arquivos a modificar:**
- `src/components/inbox/AudioPlayer.tsx`

---

### 10. Pesquisa de Conversas Não Funciona

**Diagnóstico:**
O `useInboxView` tem filtro de `search` (linha 164-172) que busca em:
- `contact_name`
- `contact_email`
- `contact_phone`
- `conversation_id`
- `last_snippet`

**Causa possível:**
- O input de busca não está passando o valor para `filters.search`
- O debounce está muito longo
- A busca é case-sensitive

**Solução:**
```typescript
// Verificar se o input de busca está conectado corretamente
// Em Inbox.tsx ou InboxFilterPopover.tsx

// Adicionar debounce de 300ms no input de busca
const [searchInput, setSearchInput] = useState("");
const debouncedSearch = useDebounce(searchInput, 300);

useEffect(() => {
  setFilters(prev => ({ ...prev, search: debouncedSearch }));
}, [debouncedSearch]);

// Garantir que a busca é case-insensitive no hook
const searchLower = filters.search.toLowerCase().trim();
if (!searchLower) return true; // Não filtrar se vazio

return (
  item.contact_name?.toLowerCase().includes(searchLower) ||
  item.contact_email?.toLowerCase().includes(searchLower) ||
  item.contact_phone?.toLowerCase().includes(searchLower) ||
  item.last_snippet?.toLowerCase().includes(searchLower)
);
```

**Arquivos a modificar:**
- `src/hooks/useInboxView.tsx`
- `src/pages/Inbox.tsx` ou componente do input de busca

---

## Priorização de Implementação

| Prioridade | Bug | Complexidade | Tempo Estimado |
|------------|-----|--------------|----------------|
| 🔴 Alta | 1 - Atribuições aleatórias | Média | 1-2h |
| 🔴 Alta | 3 - Conversas perdendo atribuições | Média | 1h |
| 🔴 Alta | 6 - Não ficar offline | Baixa | 30min |
| 🟡 Média | 2 - Mensagens duplicadas | Média | 1h |
| 🟡 Média | 9 - Velocidade áudio | Baixa | 30min |
| 🟡 Média | 10 - Pesquisa conversas | Baixa | 30min |
| 🟢 Baixa | 7 - Busca de tags | Baixa | 20min |
| 🟢 Baixa | 8 - Mensagem marcada | Alta | 2-3h |
| ⚪ Pendente | 4 - Link comercial | ? | Precisa contexto |
| ⚪ Pendente | 5 - Trocando palavras | ? | Precisa contexto |

---

## Próximos Passos

1. **Aprovar plano** para iniciar implementação
2. Para bugs 4 e 5, fornecer:
   - Onde o link de compra comercial aparece?
   - Exemplo de "troca de palavras" (antes/depois)

---

## Seção Técnica - Arquivos a Modificar

```text
supabase/functions/
├── distribute-pending-conversations/index.ts  (Bug 1)
├── route-conversation/index.ts                (Bug 1)
├── go-offline-manual/index.ts                 (Bug 6 - verificar)
├── handle-whatsapp-event/index.ts             (Bug 8)

src/
├── hooks/
│   ├── useMessages.tsx                        (Bug 2)
│   ├── useInboxView.tsx                       (Bug 10)
│   └── useManageAvailabilityStatus.tsx        (Bug 6)
├── components/
│   ├── inbox/
│   │   ├── AudioPlayer.tsx                    (Bug 9)
│   │   ├── InboxSidebar.tsx                   (Bug 7)
│   │   └── MessageBubble.tsx                  (Bug 8)
│   └── ...
└── pages/
    └── Inbox.tsx                              (Bug 10)

supabase/migrations/
└── [nova] fix_redistribute_trigger.sql        (Bug 3)
└── [nova] add_quoted_message_id.sql           (Bug 8)
```
