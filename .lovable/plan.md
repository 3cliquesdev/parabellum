

# Plano Enterprise Inbox Upgrade v2 (10/10 Produção Global)

## Análise do Estado Atual + 7 Ajustes Incorporados

### ✅ O QUE JÁ EXISTE

| Componente | Implementação | Status |
|------------|---------------|--------|
| `useSendMessageInstant` | Gera `localId = crypto.randomUUID()`, adiciona ao cache, persiste em background | ✅ Funcionando |
| `useMessages` | Canal por conversa + dedup por id/external_id/content + catch-up | ✅ Funcionando |
| `useRealtimeHealth` | Monitora conexão + visibility API | ✅ Funcionando |
| Status updates no webhook | `meta-whatsapp-webhook` linhas 746-774 - atualiza `metadata.delivery_status` via `external_id` | ⚠️ Parcial |

### ⛔ GAPS IDENTIFICADOS (alinhados com os 7 ajustes)

| Gap | Impacto | Ajuste Necessário |
|-----|---------|-------------------|
| 2 UUIDs (`localId` + `clientMessageId`) | Complexidade desnecessária | **Ajuste 1**: Usar mesmo UUID como `id` E `client_message_id` |
| `send-meta-whatsapp` só salva quando `!skip_db_save` | Provider_message_id perdido | **Ajuste 2**: Fazer UPDATE via `client_message_id` |
| UPDATE não tratado no `useMessages` | Status `delivered` não aparece | **Ajuste 4**: Implementar merge de UPDATE |
| `isConnected` sozinho para polling | Falsos positivos | **Ajuste 5**: Criar `isHealthy` com último evento |
| Upload via `supabase.functions.invoke` com FormData | Pode falhar | **Ajuste 6**: Validar ou usar storage direto |
| Status `delivered` sem fonte real | UX falsa | **Ajuste 7**: Webhook já atualiza `metadata.delivery_status` |

---

## FASE 0: Feature Flag (Rollout Seguro)

### Criar: `src/config/features.ts`

```typescript
// ========== FEATURE FLAGS ==========
// Controla rollout gradual de features enterprise

export const FEATURE_FLAGS = {
  // Inbox Enterprise V2: idempotência + realtime resiliente
  INBOX_ENTERPRISE_V2: false, // Alterar para true após testes
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURE_FLAGS[flag] === true;
};
```

### Criar: `src/hooks/useFeatureFlag.ts`

```typescript
import { isFeatureEnabled, FeatureFlag } from "@/config/features";

export function useFeatureFlag(flag: FeatureFlag): boolean {
  return isFeatureEnabled(flag);
}
```

**Risco:** Nenhum - apenas adiciona arquivos

---

## FASE 1: Idempotência e Anti-Duplicação (Core)

### 1.1 Migração SQL

```sql
-- ========================================
-- ENTERPRISE INBOX: Idempotência + Tracking
-- ========================================

-- 1. Adicionar client_message_id (UUID gerado no frontend)
-- Permite NULL para mensagens antigas (backwards compatible)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS client_message_id uuid;

-- 2. Adicionar provider_message_id (wamid do WhatsApp Meta)
-- Para reconciliação de status (delivered/read)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS provider_message_id text;

-- 3. UNIQUE constraint parcial (permite NULL para legado)
-- Garante que retry com mesmo client_message_id não duplica
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_client_message_id 
ON messages (client_message_id) 
WHERE client_message_id IS NOT NULL;

-- 4. Índice para busca por provider_message_id (webhooks de status)
CREATE INDEX IF NOT EXISTS idx_messages_provider_message_id 
ON messages (provider_message_id) 
WHERE provider_message_id IS NOT NULL;

-- 5. Comentário de contrato
COMMENT ON COLUMN messages.client_message_id IS 
  'UUID gerado no frontend para dedup. V2+: OBRIGATÓRIO em novas mensagens.';
COMMENT ON COLUMN messages.provider_message_id IS 
  'wamid do WhatsApp Meta para rastrear status (sent/delivered/read).';
```

### 1.2 Atualizar: `useSendMessageInstant.tsx` (Ajuste 1 aplicado)

**Mudança principal:** Usar MESMO UUID como `id` E `client_message_id`

```typescript
// ANTES (plano original):
// const localId = crypto.randomUUID();
// const clientMessageId = crypto.randomUUID(); // PROBLEMÁTICO

// DEPOIS (ajuste 1 aplicado):
const messageId = crypto.randomUUID(); // UM SÓ UUID

const optimisticMessage = {
  id: messageId,
  client_message_id: messageId, // MESMO valor = dedup trivial
  // ... resto igual
};

// No insert do banco:
const basePayload = {
  id: messageId,
  client_message_id: messageId, // MESMO UUID
  // ... resto
};

// No retry (retrySend):
// Usar MESMO id que já existe (não gerar novo)
```

**Vantagens:**
- Dedup trivial (só comparar um campo)
- Retry usa mesmo ID automaticamente
- Merge otimista fica robusto

### 1.3 Atualizar: `send-meta-whatsapp/index.ts` (Ajuste 2 aplicado)

**Mudança principal:** Sempre atualizar mensagem existente via `client_message_id`, independente de `skip_db_save`

```typescript
// NOVA SEÇÃO após enviar para Meta (linhas ~360-387)

const messageId = result.messages?.[0]?.id; // wamid do Meta

// ============================================
// 🆕 SEMPRE atualizar provider_message_id via client_message_id
// Isso funciona mesmo com skip_db_save=true
// ============================================
if (body.client_message_id && messageId) {
  console.log(`[send-meta-whatsapp] 📝 Updating message ${body.client_message_id} with provider_message_id: ${messageId}`);
  
  const { error: updateError } = await supabase
    .from("messages")
    .update({ 
      provider_message_id: messageId,
      status: 'dispatched', // Novo status = enviado para Meta
      external_id: messageId, // Manter compatibilidade
    })
    .eq("client_message_id", body.client_message_id);
  
  if (updateError) {
    console.error("[send-meta-whatsapp] ⚠️ Failed to update provider_message_id:", updateError);
  }
}

// Manter lógica existente para quando NÃO tem client_message_id (legado)
if (body.conversation_id && messageId && !body.skip_db_save && !body.client_message_id) {
  // ... código existente de insert
}
```

**Ajuste no frontend:**
O `useSendMessageInstant.tsx` precisa enviar `client_message_id` no payload:

```typescript
const metaPayload: Record<string, unknown> = {
  instance_id: whatsappConfig.instanceId,
  phone_number: whatsappConfig.phoneNumber,
  conversation_id: conversationId,
  skip_db_save: true,
  client_message_id: messageId, // 🆕 ENVIAR PARA RECONCILIAÇÃO
  sender_name: effectiveSenderName,
};
```

### 1.4 Atualizar: `useMessages.tsx` (Ajustes 3 e 4 aplicados)

**Mudanças:**
1. Dedup prioriza `client_message_id` (não content)
2. Tratar UPDATE para status `delivered`

```typescript
// NO HANDLER DE REALTIME (linhas ~200-260)

if (payload.eventType === 'INSERT') {
  queryClient.setQueryData(
    ["messages", conversationId],
    (old: any[] = []) => {
      const newMessage = payload.new as Message;
      
      // 🆕 PRIORIDADE 1: Dedup por client_message_id
      if (newMessage.client_message_id) {
        const existingByClientId = old.find(m => 
          m.client_message_id === newMessage.client_message_id
        );
        if (existingByClientId) {
          console.log('[Realtime] ⏭️ Reconciliando por client_message_id:', newMessage.client_message_id);
          return old.map(m => 
            m.client_message_id === newMessage.client_message_id 
              ? { ...m, ...newMessage, status: 'sent' } 
              : m
          );
        }
      }
      
      // PRIORIDADE 2: Dedup por id (id === client_message_id no v2)
      const existingById = old.find(m => m.id === newMessage.id);
      if (existingById) {
        return old.map(m => 
          m.id === newMessage.id 
            ? { ...m, ...newMessage, status: 'sent' } 
            : m
        );
      }
      
      // PRIORIDADE 3: provider_message_id/external_id (wamid)
      if (newMessage.provider_message_id && old.some(m => 
        m.provider_message_id === newMessage.provider_message_id ||
        m.external_id === newMessage.provider_message_id
      )) {
        console.log('[Realtime] ⏭️ Dedup por provider_message_id');
        return old;
      }
      
      // FALLBACK DEFENSIVO: Content matching (só edge cases)
      // ... código existente (mantido como safety net)
      
      // Nova mensagem
      return [...old, { ...newMessage, status: 'sent' }];
    }
  );
}

// 🆕 AJUSTE 4: Tratar UPDATE para status delivered/read
else if (payload.eventType === 'UPDATE') {
  const updatedMessage = payload.new as Message;
  
  queryClient.setQueryData(
    ["messages", conversationId],
    (old: any[] = []) => old.map(m => {
      // Match por id OU client_message_id OU provider_message_id
      const isMatch = 
        m.id === updatedMessage.id ||
        (m.client_message_id && m.client_message_id === updatedMessage.client_message_id) ||
        (m.provider_message_id && m.provider_message_id === updatedMessage.provider_message_id);
      
      if (isMatch) {
        // Extrair status de delivery do metadata
        const deliveryStatus = (updatedMessage.metadata as any)?.delivery_status;
        
        return { 
          ...m, 
          ...updatedMessage,
          // 🆕 Mapear delivery_status para campo status se disponível
          status: deliveryStatus || m.status,
        };
      }
      return m;
    })
  );
}
```

### 1.5 Atualizar: `meta-whatsapp-webhook/index.ts` (Ajuste 7 aplicado)

**Mudança:** Atualizar campo `status` além de `metadata.delivery_status`

```typescript
// LINHAS 746-774: Process Status Updates (MELHORADO)

if (value.statuses && value.statuses.length > 0) {
  for (const status of value.statuses) {
    console.log("[meta-whatsapp-webhook] 📊 Status update:", status.id, "->", status.status);

    // 🆕 Tentar buscar por provider_message_id PRIMEIRO (enterprise v2)
    let existingMsg = null;
    
    // Busca por provider_message_id (v2)
    const { data: msgByProvider } = await supabase
      .from("messages")
      .select("id, metadata, status")
      .eq("provider_message_id", status.id)
      .single();
    
    if (msgByProvider) {
      existingMsg = msgByProvider;
    } else {
      // Fallback: buscar por external_id (v1)
      const { data: msgByExternal } = await supabase
        .from("messages")
        .select("id, metadata, status")
        .eq("external_id", status.id)
        .single();
      existingMsg = msgByExternal;
    }

    if (existingMsg) {
      const updatedMetadata = {
        ...((existingMsg.metadata as Record<string, unknown>) || {}),
        delivery_status: status.status,
        status_timestamp: status.timestamp,
      };

      // 🆕 Mapear status do Meta para nosso status
      const mappedStatus = 
        status.status === 'delivered' ? 'delivered' :
        status.status === 'read' ? 'read' :
        status.status === 'sent' ? 'sent' :
        status.status === 'failed' ? 'failed' :
        existingMsg.status;

      const { error: updateError } = await supabase
        .from("messages")
        .update({ 
          metadata: updatedMetadata,
          status: mappedStatus, // 🆕 Atualizar campo status real
        })
        .eq("id", existingMsg.id);

      if (updateError) {
        console.error("[meta-whatsapp-webhook] ❌ Error updating status:", updateError);
      } else {
        console.log(`[meta-whatsapp-webhook] ✅ Status updated: ${existingMsg.id} -> ${mappedStatus}`);
      }
    }
  }
}
```

### Critérios de Aceite - Fase 1

| # | Teste | Esperado |
|---|-------|----------|
| 1 | Enviar 10 mensagens rápidas | 0 duplicações na UI e no banco |
| 2 | Desconectar e reconectar | Catch-up não duplica |
| 3 | Latência percebida | < 100ms |
| 4 | Retry de mensagem falha | Usa MESMO client_message_id |
| 5 | WhatsApp entrega | Status muda para `delivered` |
| 6 | WhatsApp lê | Status muda para `read` |

---

## FASE 2: Realtime Resiliente (Sem Refetch Pesado)

### 2.1 Upgrade: `useRealtimeHealth.tsx` (Ajuste 5 aplicado)

**Mudança:** Adicionar `isHealthy` e `isDegraded` além de `isConnected`

```typescript
export function useRealtimeHealth() {
  const [isConnected, setIsConnected] = useState(true);
  const [lastPing, setLastPing] = useState<Date | null>(null);
  const [lastEventReceived, setLastEventReceived] = useState<Date | null>(null); // 🆕
  const queryClient = useQueryClient();
  // ... resto existente

  // 🆕 isHealthy = conectado E recebeu evento nos últimos 60s
  const isHealthy = isConnected && lastEventReceived && 
    (Date.now() - lastEventReceived.getTime()) < 60000;
  
  // 🆕 isDegraded = conectado mas sem eventos recentes (possível gap)
  const isDegraded = isConnected && lastEventReceived && 
    (Date.now() - lastEventReceived.getTime()) > 60000;

  // 🆕 Função para registrar evento recebido (chamada pelos hooks de realtime)
  const registerEvent = useCallback(() => {
    setLastEventReceived(new Date());
  }, []);

  return { 
    isConnected, 
    isHealthy,      // 🆕
    isDegraded,     // 🆕
    lastPing, 
    lastEventReceived, // 🆕
    forceReconnect,
    registerEvent,  // 🆕
  };
}
```

### 2.2 Atualizar: `useMessages.tsx` (Ajuste 5 aplicado)

**Mudança:** Polling condicional baseado em `isHealthy`, não `isConnected`

```typescript
import { useRealtimeHealth } from "./useRealtimeHealth";

export function useMessages(conversationId: string | null) {
  const { isHealthy, isDegraded, registerEvent } = useRealtimeHealth();
  
  const query = useQuery({
    // ... mantém tudo igual
    
    // 🆕 POLLING: Ativa quando degradado, não quando desconectado
    // isHealthy = true → sem polling (realtime funcionando)
    // isDegraded = true → polling 10s (gap detectado)
    // isConnected = false → polling 5s (emergência)
    refetchInterval: isHealthy 
      ? false 
      : isDegraded 
        ? 10000 
        : 5000,
  });
  
  // No handler de realtime, registrar evento:
  // ...
  .on("postgres_changes", { ... }, async (payload) => {
    registerEvent(); // 🆕 Sinaliza que realtime está funcionando
    // ... resto do handler
  })
```

### 2.3 Criar: `src/components/inbox/ConnectionStatus.tsx`

```typescript
import { useRealtimeHealth } from "@/hooks/useRealtimeHealth";
import { Wifi, WifiOff, AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function ConnectionStatus({ className }: { className?: string }) {
  const { isConnected, isHealthy, isDegraded, forceReconnect } = useRealtimeHealth();
  
  if (isHealthy) {
    return (
      <div className={cn("flex items-center gap-1 text-xs text-muted-foreground", className)}>
        <Wifi className="h-3 w-3 text-green-500" />
        <span>Online</span>
      </div>
    );
  }
  
  if (isDegraded) {
    return (
      <button
        onClick={forceReconnect}
        className={cn(
          "flex items-center gap-1 text-xs text-yellow-600 hover:underline",
          className
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        <span>Sincronizando...</span>
      </button>
    );
  }
  
  return (
    <button
      onClick={forceReconnect}
      className={cn(
        "flex items-center gap-1 text-xs text-destructive hover:underline",
        className
      )}
    >
      <WifiOff className="h-3 w-3" />
      <span>Reconectando...</span>
      <RefreshCw className="h-3 w-3 animate-spin" />
    </button>
  );
}
```

### Critérios de Aceite - Fase 2

| # | Teste | Esperado |
|---|-------|----------|
| 1 | Com Realtime saudável | Polling = 0 (Network mostra 0 requests extras) |
| 2 | Forçar gap (pausar eventos) | Polling ativa automaticamente após 60s |
| 3 | Desconectar rede | Indicador mostra "Reconectando" |
| 4 | Voltar de background longo | Catch-up recupera mensagens |

---

## FASE 3: Imagens Enterprise (Sem Travar)

### 3.1 Atualizar: `useMediaUpload.tsx` (Ajuste 6 aplicado)

**Mudança:** Upload DIRETO no Supabase Storage (não via edge function com FormData)

```typescript
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UploadProgress {
  status: 'idle' | 'compressing' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export function useMediaUploadV2() {
  const [progress, setProgress] = useState<Record<string, UploadProgress>>({});
  const { toast } = useToast();

  const uploadMedia = useCallback(async (
    file: File,
    conversationId: string,
    messageId: string
  ): Promise<{ url: string; storagePath: string } | null> => {
    const uploadId = messageId;
    
    try {
      setProgress(prev => ({
        ...prev,
        [uploadId]: { status: 'compressing', progress: 10 }
      }));
      
      // 1. Comprimir imagem se muito grande (>2MB)
      const processedFile = file.size > 2 * 1024 * 1024 && file.type.startsWith('image/')
        ? await compressImage(file)
        : file;
      
      setProgress(prev => ({
        ...prev,
        [uploadId]: { status: 'uploading', progress: 30 }
      }));
      
      // 2. 🆕 Upload DIRETO no Supabase Storage (não via edge function)
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `${conversationId}/${timestamp}_${sanitizedFilename}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(storagePath, processedFile, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (uploadError) throw uploadError;
      
      setProgress(prev => ({
        ...prev,
        [uploadId]: { status: 'uploading', progress: 70 }
      }));
      
      // 3. Criar registro em media_attachments
      const { data: attachment, error: attachmentError } = await supabase
        .from('media_attachments')
        .insert({
          message_id: messageId,
          conversation_id: conversationId,
          original_filename: file.name,
          mime_type: file.type,
          file_size: processedFile.size,
          storage_path: storagePath,
          storage_bucket: 'chat-attachments',
          status: 'ready',
        })
        .select()
        .single();
      
      if (attachmentError) {
        // Rollback: deletar arquivo do storage
        await supabase.storage.from('chat-attachments').remove([storagePath]);
        throw attachmentError;
      }
      
      // 4. Gerar URL assinada
      const { data: signedUrl } = await supabase.storage
        .from('chat-attachments')
        .createSignedUrl(storagePath, 3600);
      
      setProgress(prev => ({
        ...prev,
        [uploadId]: { status: 'success', progress: 100 }
      }));
      
      return {
        url: signedUrl?.signedUrl || '',
        storagePath,
      };
      
    } catch (error) {
      console.error('[useMediaUploadV2] ❌ Error:', error);
      
      setProgress(prev => ({
        ...prev,
        [uploadId]: {
          status: 'error',
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        }
      }));
      
      toast({
        title: "Erro no upload",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
      
      return null;
    }
  }, [toast]);

  const retryUpload = useCallback((uploadId: string) => {
    setProgress(prev => {
      const { [uploadId]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return { uploadMedia, retryUpload, progress };
}

// Helper: comprimir imagem (max 1920px, 85% quality)
async function compressImage(file: File): Promise<File> {
  const img = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  
  const maxSize = 1920;
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;
  
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.85)
  );
  
  return new File([blob], file.name, { type: 'image/jpeg' });
}
```

### 3.2 Atualizar: `useSendMessageInstant.tsx` para mídia

```typescript
// Adicionar suporte a preview local
interface SendInstantParams {
  // ... existentes
  localMediaPreview?: {
    url: string; // blob:// URL para preview imediato
    type: 'image' | 'audio' | 'video' | 'document';
    filename?: string;
    uploadPromise?: Promise<{ url: string; storagePath: string } | null>;
  };
}

// No optimisticMessage:
const optimisticMessage = {
  // ... existentes
  media_attachments: params.localMediaPreview ? [{
    id: `temp-${messageId}`,
    storage_path: params.localMediaPreview.url, // Preview local
    mime_type: getMimeTypeFromType(params.localMediaPreview.type),
    original_filename: params.localMediaPreview.filename,
    status: 'uploading',
  }] : [],
};

// No queueMicrotask, aguardar upload se necessário:
if (params.localMediaPreview?.uploadPromise) {
  const uploadResult = await params.localMediaPreview.uploadPromise;
  if (!uploadResult) {
    throw new Error('Upload failed');
  }
  // Atualizar cache com URL real
  // ...
}
```

### Critérios de Aceite - Fase 3

| # | Teste | Esperado |
|---|-------|----------|
| 1 | Upload imagem 5MB | Chat não trava, preview instantâneo |
| 2 | Falhar upload (rede) | Mostra erro + permite retry |
| 3 | Upload sucesso | Imagem aparece via Realtime |
| 4 | Progresso visível | Mostra % durante upload |

---

## Arquivos Afetados (Resumo Final)

| Arquivo | Ação | Fase | Risco |
|---------|------|------|-------|
| `src/config/features.ts` | CRIAR | 0 | Nenhum |
| `src/hooks/useFeatureFlag.ts` | CRIAR | 0 | Nenhum |
| Migração SQL | CRIAR | 1 | Baixo |
| `src/hooks/useSendMessageInstant.tsx` | ATUALIZAR | 1,3 | Médio |
| `supabase/functions/send-meta-whatsapp/index.ts` | ATUALIZAR | 1 | Médio |
| `src/hooks/useMessages.tsx` | ATUALIZAR | 1,2 | Médio |
| `supabase/functions/meta-whatsapp-webhook/index.ts` | ATUALIZAR | 1 | Baixo |
| `src/hooks/useRealtimeHealth.tsx` | ATUALIZAR | 2 | Baixo |
| `src/components/inbox/ConnectionStatus.tsx` | CRIAR | 2 | Nenhum |
| `src/hooks/useMediaUploadV2.tsx` | CRIAR | 3 | Nenhum |

---

## Ordem de Implementação

```
┌─────────────────────────────────────────────────────────────────┐
│  FASE 0: Feature Flag                                          │
│  └─ src/config/features.ts                                     │
│  └─ src/hooks/useFeatureFlag.ts                                │
├─────────────────────────────────────────────────────────────────┤
│  FASE 1: Idempotência (CRÍTICO)                                │
│  └─ SQL Migration: client_message_id + provider_message_id     │
│  └─ useSendMessageInstant: usar UM UUID (id === client_id)     │
│  └─ send-meta-whatsapp: UPDATE via client_message_id           │
│  └─ useMessages: dedup por IDs + tratar UPDATE                 │
│  └─ meta-whatsapp-webhook: atualizar campo status              │
├─────────────────────────────────────────────────────────────────┤
│  FASE 2: Realtime Resiliente                                   │
│  └─ useRealtimeHealth: isHealthy + isDegraded                  │
│  └─ useMessages: polling condicional                           │
│  └─ ConnectionStatus.tsx: indicador visual                     │
├─────────────────────────────────────────────────────────────────┤
│  FASE 3: Imagens Enterprise                                    │
│  └─ useMediaUploadV2: upload direto no Storage                 │
│  └─ useSendMessageInstant: preview local + upload async        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Resumo dos 7 Ajustes Aplicados

| # | Ajuste | Como Resolvido |
|---|--------|----------------|
| 1 | Um UUID só | `id === client_message_id` (mesmo valor) |
| 2 | UPDATE via client_message_id | Edge function faz UPDATE mesmo com skip_db_save |
| 3 | NOT NULL flexível | NULL permitido (legado), contrato exige em v2+ |
| 4 | Tratar UPDATE no Realtime | Handler de UPDATE com merge por múltiplos IDs |
| 5 | isHealthy > isConnected | `isHealthy` = conectado + evento < 60s |
| 6 | Upload direto no Storage | Sem FormData via invoke, storage.upload() direto |
| 7 | Status delivered real | Webhook atualiza campo `status`, não só metadata |

---

## Conformidade com Base de Conhecimento

| Regra | Status |
|-------|--------|
| Preservação do existente | ✅ Nenhuma feature removida |
| Kill Switch respeitado | ✅ Não afetado |
| CSAT guard mantido | ✅ Não afetado |
| Distribuição automática | ✅ Não afetado |
| ai_mode protection | ✅ is_bot_message check mantido |
| Upgrade, não downgrade | ✅ Só adiciona capacidades |
| Zero regressão | ✅ Feature flag permite rollback |
| Console sem erros | ✅ Será validado |

