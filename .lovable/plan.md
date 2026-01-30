
# Plano: Modo de Teste de IA Individual por Conversa

## Resumo Executivo

Implementar um sistema para testar a IA em **uma conversa específica** sem afetar as demais. Isso permite validar fluxos, personas e configurações antes de liberar para produção.

---

## Problema Atual

```text
HOJE:
┌─────────────────────────────────┐
│ IA Global: ON                   │
│ → TODAS as conversas autopilot  │
│   recebem resposta da IA        │
└─────────────────────────────────┘

ou

┌─────────────────────────────────┐
│ IA Global: OFF                  │
│ → NENHUMA conversa recebe IA    │
│ → Não dá para testar            │
└─────────────────────────────────┘
```

---

## Solução Proposta

### Opção 1: Flag de Teste por Conversa (Recomendado)

Adicionar um campo `is_test_mode` na tabela `conversations` que **ignora** o toggle global da IA:

```text
NOVO:
┌─────────────────────────────────┐
│ Conversa A: is_test_mode: true  │
│ → IA RODA (ignora global off)   │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Conversa B: is_test_mode: false │
│ → Respeita IA Global (off)      │
│ → IA NÃO RODA                   │
└─────────────────────────────────┘
```

### Interface no Inbox

Botão na conversa para ativar modo teste:

```text
┌────────────────────────────────────────────────┐
│ [🧪 Modo Teste]  [🤖 Autopilot ▼]  [Assumir]   │
└────────────────────────────────────────────────┘
         │
         ▼
  "Ativar IA apenas nesta conversa para testar"
```

---

## O Que Será Implementado

### 1. Migração de Banco de Dados

Adicionar coluna na tabela `conversations`:

```sql
ALTER TABLE conversations 
ADD COLUMN is_test_mode BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN conversations.is_test_mode IS 
'Quando true, ignora ai_global_enabled e processa IA normalmente. Usado para testes.';
```

### 2. Atualizar Edge Functions

Modificar a verificação do `ai_global_enabled` para considerar `is_test_mode`:

**message-listener/index.ts:**
```typescript
// ANTES
if (aiGlobalEnabled === 'false') {
  console.log('[message-listener] ⛔ AI global disabled');
  return;
}

// DEPOIS
if (aiGlobalEnabled === 'false' && !conversation.is_test_mode) {
  console.log('[message-listener] ⛔ AI global disabled (e não é test mode)');
  return;
}

if (conversation.is_test_mode) {
  console.log('[message-listener] 🧪 TEST MODE - Ignorando ai_global_enabled');
}
```

**ai-autopilot-chat/index.ts:**
```typescript
// Mesma lógica - verificar is_test_mode antes de bloquear
```

### 3. Hook para Toggle de Modo Teste

Criar `src/hooks/useTestModeToggle.tsx`:

```typescript
export function useTestModeToggle(conversationId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (enabled: boolean) => {
      const { error } = await supabase
        .from('conversations')
        .update({ is_test_mode: enabled })
        .eq('id', conversationId);
      
      if (error) throw error;
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      toast.success(enabled 
        ? '🧪 Modo Teste ativado - IA rodará nesta conversa' 
        : '✅ Modo Teste desativado'
      );
    }
  });
}
```

### 4. Botão na Interface do Inbox

Adicionar botão de teste na área de header da conversa:

```typescript
// Em ConversationDetail ou similar
<Button
  variant={isTestMode ? "default" : "outline"}
  size="sm"
  onClick={() => toggleTestMode.mutate(!isTestMode)}
  className={isTestMode ? "bg-amber-500 hover:bg-amber-600" : ""}
>
  <FlaskConical className="h-4 w-4 mr-1" />
  {isTestMode ? "🧪 Modo Teste ATIVO" : "Testar IA"}
</Button>
```

---

## Fluxo de Uso

```text
1. Administrador vai no Inbox
2. Abre uma conversa específica
3. Clica em "🧪 Testar IA"
4. Sistema ativa is_test_mode: true
5. IA responde APENAS nesta conversa
6. Administrador valida o comportamento
7. Desativa modo teste quando terminar
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `migrations/add_test_mode.sql` | Criar coluna `is_test_mode` |
| `supabase/functions/message-listener/index.ts` | Verificar `is_test_mode` |
| `supabase/functions/ai-autopilot-chat/index.ts` | Verificar `is_test_mode` |
| `supabase/functions/process-chat-flow/index.ts` | Verificar `is_test_mode` |
| `src/hooks/useTestModeToggle.tsx` | Novo hook para toggle |
| `src/components/inbox/ConversationHeader.tsx` | Botão de modo teste |

---

## Segurança

- **Apenas admins/managers** podem ativar modo teste
- Modo teste é **destacado visualmente** (badge amarelo)
- Log de auditoria quando modo teste é ativado
- Modo teste **não afeta produção** — outras conversas continuam normais

---

## Alternativa Simplificada (Opcional)

Se preferir algo mais rápido para testar AGORA:

### Opção 2: Ligar IA Global + Filtrar por Canal

1. Ligar `ai_global_enabled: true`
2. Criar um fluxo que só responde para `channel = 'web_chat'`
3. Testar via widget do site (não afeta WhatsApp)

Mas isso é menos preciso que a Opção 1.

---

## Próximos Passos (Após Aprovação)

1. Criar migração para adicionar `is_test_mode`
2. Atualizar as 3 Edge Functions
3. Criar hook `useTestModeToggle`
4. Adicionar botão na interface do Inbox
5. Testar o fluxo completo
6. Deploy

---

## Tempo Estimado

- Migração: 2 minutos
- Edge Functions: 10 minutos
- Hook + UI: 10 minutos
- Testes: 5 minutos

**Total: ~30 minutos**
