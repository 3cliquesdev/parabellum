

# Plano: Sistema de Broadcast com Job Assíncrono + Progresso em Tempo Real

## Problema Identificado

A UI mostra "travou em 90%" porque:
1. A Edge Function processa **264 conversas sequencialmente** (delay de 200ms cada = ~53s)
2. A requisição HTTP fica aberta até completar tudo
3. Se a função der timeout ou a conexão cair, parece "travado"

## Solução: Arquitetura de Job Assíncrono

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           NOVO FLUXO                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. UI dispara broadcast                                                    │
│     └──▶ Edge Function cria job na tabela 'broadcast_jobs'                  │
│         └──▶ Retorna imediatamente com job_id                               │
│                                                                             │
│  2. Edge Function continua em background (waitUntil)                        │
│     └──▶ Envia mensagens uma a uma                                          │
│         └──▶ Atualiza 'broadcast_jobs.progress' a cada envio                │
│                                                                             │
│  3. UI escuta via Realtime                                                  │
│     └──▶ Mostra progresso real: "150/264 enviados"                          │
│         └──▶ Botão "Cancelar" disponível                                    │
│                                                                             │
│  4. Se usuário clicar Cancelar                                              │
│     └──▶ Atualiza 'broadcast_jobs.status' = 'cancelled'                     │
│         └──▶ Edge Function verifica status e para                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações a Implementar

### 1. Nova Tabela: `broadcast_jobs`

```sql
CREATE TABLE broadcast_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Configuração
  message TEXT NOT NULL,
  target_filter JSONB DEFAULT '{}',  -- Filtros usados (ai_queue, etc)
  
  -- Progresso
  status TEXT DEFAULT 'pending',  -- pending, running, completed, cancelled, failed
  total INT DEFAULT 0,
  sent INT DEFAULT 0,
  failed INT DEFAULT 0,
  skipped INT DEFAULT 0,
  
  -- Resultados detalhados
  results JSONB DEFAULT '[]',  -- Array de {conversation_id, phone, status, error}
  
  -- Controle
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  error_message TEXT
);

-- Habilitar Realtime para progresso
ALTER PUBLICATION supabase_realtime ADD TABLE broadcast_jobs;

-- RLS: apenas admin/manager pode ver/criar
```

### 2. Refatorar Edge Function: `broadcast-ai-queue`

**Novo fluxo:**

```typescript
// 1. Criar job imediatamente
const { data: job } = await supabase
  .from('broadcast_jobs')
  .insert({ message, created_by: userId, status: 'pending' })
  .select()
  .single();

// 2. Retornar job_id para UI (resposta rápida)
const response = new Response(JSON.stringify({ 
  job_id: job.id, 
  message: 'Broadcast iniciado' 
}));

// 3. Continuar processamento em background
EdgeRuntime.waitUntil(async () => {
  // Atualizar status para 'running'
  await supabase.from('broadcast_jobs')
    .update({ status: 'running', started_at: new Date() })
    .eq('id', job.id);
  
  for (const conv of conversations) {
    // Verificar cancelamento
    const { data: currentJob } = await supabase
      .from('broadcast_jobs')
      .select('status')
      .eq('id', job.id)
      .single();
    
    if (currentJob.status === 'cancelled') {
      break; // Parar processamento
    }
    
    // Enviar mensagem
    await sendMessage(conv);
    
    // Atualizar progresso (a cada 5 envios para não sobrecarregar)
    if (sent % 5 === 0) {
      await supabase.from('broadcast_jobs')
        .update({ sent, failed })
        .eq('id', job.id);
    }
  }
  
  // Marcar como concluído
  await supabase.from('broadcast_jobs')
    .update({ status: 'completed', completed_at: new Date() })
    .eq('id', job.id);
});

return response;
```

### 3. Atualizar Dialog: `BroadcastAIQueueDialog`

**Novo comportamento:**

- Ao clicar "Enviar", recebe `job_id` imediatamente
- Muda para modo "monitoramento" 
- Escuta via Realtime: `supabase.channel('broadcast-progress').on('postgres_changes', ...)`
- Mostra progresso real: "Enviando... 150/264 (57%)"
- Botão "Cancelar" visível durante execução
- Ao completar, mostra resultado final
- Dialog pode ser fechado - o job continua no backend

### 4. Novo Componente: `BroadcastHistoryDialog`

**Funcionalidades:**

- Lista broadcasts anteriores
- Status de cada um (concluído, cancelado, em andamento)
- Detalhes: quem criou, quando, quantos enviados/falhas
- Opção de ver log detalhado (quais contatos receberam)

### 5. Atualizar Botão: `BroadcastAIQueueButton`

- Se houver broadcast em andamento, mostrar indicador
- Adicionar ícone de histórico

---

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| Migração SQL | Tabela `broadcast_jobs` com RLS |
| `src/components/inbox/BroadcastHistoryDialog.tsx` | Histórico de broadcasts |
| `src/hooks/useBroadcastProgress.ts` | Hook para Realtime do job |

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/broadcast-ai-queue/index.ts` | Arquitetura de job assíncrono com waitUntil |
| `src/components/inbox/BroadcastAIQueueDialog.tsx` | Monitoramento Realtime + Cancelar |
| `src/components/inbox/BroadcastAIQueueButton.tsx` | Indicador de andamento + link histórico |

---

## Detalhes Técnicos

### Progresso via Realtime

```typescript
// Hook: useBroadcastProgress
const channel = supabase
  .channel(`broadcast-${jobId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'broadcast_jobs',
    filter: `id=eq.${jobId}`
  }, (payload) => {
    setProgress(payload.new);
  })
  .subscribe();
```

### Cancelamento

```typescript
const cancelBroadcast = async (jobId: string) => {
  await supabase
    .from('broadcast_jobs')
    .update({ 
      status: 'cancelled', 
      cancelled_at: new Date().toISOString() 
    })
    .eq('id', jobId);
};
```

### RLS Policies

```sql
-- Apenas admin/manager pode criar
CREATE POLICY "Managers can create broadcasts" ON broadcast_jobs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'general_manager')
    )
  );

-- Apenas admin/manager pode ver
CREATE POLICY "Managers can view broadcasts" ON broadcast_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'general_manager')
    )
  );

-- Apenas admin/manager pode cancelar
CREATE POLICY "Managers can cancel broadcasts" ON broadcast_jobs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'manager', 'general_manager')
    )
  );
```

---

## Fluxo de Uso Atualizado

1. Admin acessa `/inbox?filter=ai_queue`
2. Clica "Broadcast (264)"
3. Edita mensagem se quiser
4. Clica "Enviar Broadcast"
5. UI mostra: "Iniciando..." e recebe `job_id`
6. UI muda para modo monitoramento:
   - Progress bar real: "45/264 enviados (17%)"
   - Botão "Cancelar" disponível
7. Admin pode fechar o dialog - job continua
8. Ao reabrir, vê status atual
9. Ao completar: "264 enviados, 0 falhas"
10. Pode acessar Histórico para ver broadcasts anteriores

---

## Vantagens

| Antes | Depois |
|-------|--------|
| Requere conexão aberta por ~1min | Resposta em menos de 1s |
| Parece travado em 90% | Progresso real atualizado |
| Não pode cancelar | Cancelamento a qualquer momento |
| Sem histórico | Auditoria completa |
| Timeout pode falhar silenciosamente | Status persistido no banco |

---

## Segurança

| Controle | Implementação |
|----------|---------------|
| Autorização | RLS: apenas admin/manager/general_manager |
| Rate Limit | 200ms entre envios (mantido) |
| Audit Trail | Tabela broadcast_jobs com criador e timestamps |
| Cancelamento | Verificação a cada envio |
| Duplicação | Job ID único, verificação de status |

