
# Plano de Implementação: FASE 6 — Confiabilidade e Autonomia Operacional

## Resumo Executivo

Esta fase implementa mecanismos de segurança críticos para garantir que a IA funcione com:
- **Previsibilidade**: Shadow Mode — IA sugere, nunca executa automaticamente
- **Controle**: Kill Switch Global — desliga tudo em 1 clique
- **Monitoramento**: Detecção de Anomalias — alertas baseados em regras simples
- **Auditabilidade**: Linha do Tempo de Aprendizado — registro de toda evolução
- **Transparência**: Tela de Auditoria Humana — aprovar/rejeitar aprendizados

---

## Diagnóstico do Estado Atual

| Componente | Status | Observação |
|------------|--------|------------|
| Kill Switch Global | ✅ Existe | `ai_global_enabled` em `system_configurations` |
| Verificação no ai-autopilot-chat | ✅ Existe | Já verifica `ai_global_enabled` |
| Shadow Mode | ❌ Não existe | Precisa criar flag e lógica |
| Detecção de Anomalias | ❌ Não existe | Precisa criar cron + regras |
| Tabela ai_learning_timeline | ❌ Não existe | Precisa criar |
| Tela de Auditoria de IA | ❌ Não existe | Precisa criar `/settings/ai-audit` |
| Proteções Anti-Alucinação | ⚠️ Parcial | Strict RAG Mode existe, falta padronizar |

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                        CONTROLES GLOBAIS                            │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │
│  │   Kill Switch    │  │   Shadow Mode    │  │  Strict RAG Mode │   │
│  │  ai_global_      │  │  ai_shadow_mode  │  │ ai_strict_rag_   │   │
│  │   enabled        │  │    = true        │  │    mode          │   │
│  │                  │  │                  │  │                  │   │
│  │  Desliga TUDO    │  │ IA sugere, não   │  │ Threshold 85%,   │   │
│  │  Zero IA ativa   │  │ aplica nada      │  │ cita fontes      │   │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EDGE FUNCTIONS (Validação)                       │
│                                                                     │
│  1. Verificar ai_global_enabled → se false, retorna imediatamente   │
│  2. Verificar ai_shadow_mode → se true, retorna { applied: false }  │
│  3. Aplicar regras anti-alucinação do prompt                       │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    DETECÇÃO DE ANOMALIAS (Cron)                     │
│                                                                     │
│  check-ai-anomalies (1x/dia):                                      │
│  ├─ CSAT drop > 15% → Alerta interno                               │
│  ├─ Resolution time +25% → Alerta interno                          │
│  └─ Adoption drop > 30% → Alerta interno                           │
│                                                                     │
│  Saída: Registro em ai_anomaly_logs + admin_alerts                 │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LINHA DO TEMPO (Auditoria)                       │
│                                                                     │
│  ai_learning_timeline:                                             │
│  ├─ learned_at: timestamp                                          │
│  ├─ learning_type: 'kb' | 'routing' | 'reply' | 'draft'            │
│  ├─ summary: descrição do aprendizado                              │
│  ├─ source_conversations: quantidade                               │
│  ├─ confidence: 'alta' | 'média' | 'baixa'                         │
│  └─ status: 'pending' | 'approved' | 'rejected'                    │
│                                                                     │
│  Toda aprendizagem passa por aqui → Humano aprova/rejeita          │
└─────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TELA DE AUDITORIA HUMANA                         │
│                    /settings/ai-audit                               │
│                                                                     │
│  Tabela simples:                                                   │
│  | Data | Tipo | Resumo | Confiança | Status | [Aprovar/Rejeitar] │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Detalhadas

### 1. Shadow Mode

**Objetivo**: IA analisa e sugere, mas NUNCA aplica automaticamente

**Migração SQL**:
```sql
-- Adicionar configuração de Shadow Mode
INSERT INTO system_configurations (key, value, category, description)
VALUES ('ai_shadow_mode', 'true', 'ai', 'Shadow Mode: IA sugere mas não aplica automaticamente')
ON CONFLICT (key) DO NOTHING;
```

**Hook Frontend** — `useShadowMode.tsx`:
```typescript
export function useShadowMode() {
  // Similar ao useStrictRAGMode
  // Retorna { isShadowMode, toggleShadowMode, isLoading }
}
```

**Uso nas Edge Functions**:
```typescript
// Em ai-autopilot-chat, extract-knowledge-from-chat, generate-kb-draft, etc:
const { data: shadowConfig } = await supabase
  .from('system_configurations')
  .select('value')
  .eq('key', 'ai_shadow_mode')
  .maybeSingle();

const isShadowMode = shadowConfig?.value === 'true';

if (isShadowMode) {
  // IA gera sugestão, mas retorna com applied: false
  return {
    status: 'shadow_mode',
    suggestions: generatedSuggestions,
    applied: false,
    message: 'Shadow Mode ativo - sugestão não aplicada automaticamente'
  };
}
```

**Impacto em Edge Functions**:
- `ai-autopilot-chat` → retorna sugestão sem enviar mensagem
- `extract-knowledge-from-chat` → gera draft mas não salva
- `generate-kb-draft` → cria rascunho como "pending_review"
- `passive-learning-cron` → registra aprendizado mas não aplica

---

### 2. Kill Switch Global (Já Existe - Padronizar)

**Status**: Já existe `ai_global_enabled`, mas precisa padronizar em TODAS as edge functions

**Padrão Obrigatório** (adicionar em todas as funções AI):
```typescript
// INÍCIO de toda edge function AI
const { data: globalConfig } = await supabase
  .from('system_configurations')
  .select('value')
  .eq('key', 'ai_global_enabled')
  .maybeSingle();

if (globalConfig?.value === 'false') {
  console.log('[função-name] 🚫 Kill Switch ativo - retornando');
  return new Response(
    JSON.stringify({ 
      status: 'disabled', 
      reason: 'kill_switch',
      ai_global_enabled: false 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

**Edge Functions que precisam verificar Kill Switch**:
- `ai-autopilot-chat` ✅ já verifica
- `ai-chat-stream` → adicionar
- `extract-knowledge-from-chat` → adicionar
- `generate-kb-draft` → adicionar
- `generate-copilot-insights` → adicionar
- `generate-smart-reply` → adicionar
- `analyze-ticket` → adicionar
- `passive-learning-cron` → adicionar

---

### 3. Detecção de Anomalias (Novo Cron)

**Nova Edge Function**: `check-ai-anomalies`

**Execução**: 1x por dia (CRON: `0 6 * * *` — 6h da manhã)

**Métricas Monitoradas**:
| Métrica | Regra | Ação |
|---------|-------|------|
| CSAT médio | Drop > 15% vs 7 dias atrás | Alerta warning |
| Tempo resolução | Aumento > 25% vs 7 dias atrás | Alerta warning |
| Adoção Copilot | Drop > 30% vs 7 dias atrás | Alerta warning |

**Nova Tabela**:
```sql
CREATE TABLE IF NOT EXISTS public.ai_anomaly_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  detected_at TIMESTAMPTZ DEFAULT now(),
  metric_type TEXT NOT NULL,           -- 'csat_drop', 'resolution_increase', 'adoption_drop'
  current_value NUMERIC NOT NULL,
  previous_value NUMERIC NOT NULL,
  change_percent NUMERIC NOT NULL,
  threshold_percent NUMERIC NOT NULL,
  severity TEXT DEFAULT 'warning',     -- 'warning', 'critical'
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES auth.users(id)
);

ALTER TABLE ai_anomaly_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read anomalies"
  ON ai_anomaly_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can acknowledge"
  ON ai_anomaly_logs FOR UPDATE
  TO authenticated
  USING (true);
```

**Lógica da Edge Function**:
```typescript
// check-ai-anomalies/index.ts
// 1. Buscar métricas dos últimos 7 dias
// 2. Comparar com 7 dias anteriores
// 3. Se variação exceder threshold, registrar anomalia + admin_alert
```

---

### 4. Linha do Tempo de Aprendizado

**Nova Tabela**:
```sql
CREATE TABLE IF NOT EXISTS public.ai_learning_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learned_at TIMESTAMPTZ DEFAULT now(),
  learning_type TEXT NOT NULL,           -- 'kb', 'routing', 'reply', 'draft'
  summary TEXT NOT NULL,                 -- Descrição do aprendizado
  source_conversations INTEGER DEFAULT 0,
  source_conversation_ids UUID[],        -- Array de IDs das conversas fonte
  confidence TEXT DEFAULT 'média',       -- 'alta', 'média', 'baixa'
  status TEXT DEFAULT 'pending',         -- 'pending', 'approved', 'rejected'
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  related_article_id UUID REFERENCES knowledge_articles(id),
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE ai_learning_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read timeline"
  ON ai_learning_timeline FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update status"
  ON ai_learning_timeline FOR UPDATE
  TO authenticated
  USING (true);

CREATE INDEX idx_learning_timeline_status ON ai_learning_timeline(status);
CREATE INDEX idx_learning_timeline_type ON ai_learning_timeline(learning_type);
```

**Integração com Edge Functions**:

Todo aprendizado passivo deve registrar na timeline:

```typescript
// Em extract-knowledge-from-chat:
await supabase.from('ai_learning_timeline').insert({
  learning_type: 'kb',
  summary: `Artigo sugerido: "${articleTitle}" baseado em conversa com CSAT ${csatRating}`,
  source_conversations: 1,
  source_conversation_ids: [conversationId],
  confidence: csatRating >= 4.5 ? 'alta' : 'média',
  status: 'pending', // Sempre pending até revisão humana
  related_article_id: draftArticleId,
  metadata: { conversation_csat: csatRating, department: departmentId }
});
```

---

### 5. Tela de Auditoria Humana

**Nova Página**: `/settings/ai-audit`

**Arquivo**: `src/pages/AIAuditPage.tsx`

**Estrutura**:
```typescript
// Interface simples - SEM dashboard complexo
export default function AIAuditPage() {
  return (
    <Layout>
      {/* Header */}
      <header>
        <h1>Auditoria de IA</h1>
        <p>Revise e aprove/rejeite aprendizados automáticos</p>
      </header>

      {/* Filtros simples */}
      <Filters>
        <StatusFilter /> {/* pending | approved | rejected */}
        <TypeFilter />   {/* kb | routing | reply | draft */}
      </Filters>

      {/* Tabela */}
      <Table>
        <Columns>
          Data | Tipo | Resumo | Confiança | Status | Ações
        </Columns>
        <Actions>
          <Button onClick={approve}>Aprovar</Button>
          <Button onClick={reject}>Rejeitar</Button>
        </Actions>
      </Table>
    </Layout>
  );
}
```

**Hook**: `useAILearningTimeline.tsx`
```typescript
// Buscar, aprovar e rejeitar aprendizados
export function useAILearningTimeline(filters) {
  // Retorna { timeline, approve, reject, isLoading }
}
```

---

### 6. Proteções Anti-Alucinação

**Prompt Mestre** (padronizar em todas as funções):
```typescript
const ANTI_HALLUCINATION_RULES = `
REGRAS ABSOLUTAS - VOCÊ NÃO PODE VIOLAR:

1. VOCÊ NÃO PODE inferir dados não presentes na base de conhecimento
2. VOCÊ NÃO PODE criar regras ou políticas
3. VOCÊ NÃO PODE executar ações diretamente (apenas sugerir)
4. VOCÊ NÃO PODE alterar estados do sistema
5. VOCÊ NÃO PODE tomar decisões finais

VOCÊ APENAS:
- Observa dados existentes
- Sugere ações com justificativa
- Cita fontes quando disponíveis
- Indica nível de confiança

Se não tiver certeza: diga "Não tenho informação suficiente".
`;
```

**Validação de Confidence**:
```typescript
// Em todas as funções que geram resposta:
const finalConfidence = Math.min(aiConfidence, systemConfidence);

// Se confidence < 60%, não aplicar automaticamente
if (finalConfidence < 0.6) {
  return {
    suggestion,
    confidence: finalConfidence,
    applied: false,
    reason: 'low_confidence'
  };
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Shadow mode config + tabelas novas |
| `src/hooks/useShadowMode.tsx` | Criar | Hook para Shadow Mode |
| `src/hooks/useAILearningTimeline.tsx` | Criar | Hook para timeline de aprendizado |
| `src/pages/AIAuditPage.tsx` | Criar | Tela de auditoria humana |
| `src/pages/AISettingsPage.tsx` | Modificar | Adicionar toggle Shadow Mode |
| `supabase/functions/check-ai-anomalies/index.ts` | Criar | Cron de detecção de anomalias |
| `supabase/functions/ai-autopilot-chat/index.ts` | Modificar | Adicionar verificação Shadow Mode |
| `supabase/functions/extract-knowledge-from-chat/index.ts` | Modificar | Registrar em ai_learning_timeline |
| `supabase/functions/generate-kb-draft/index.ts` | Modificar | Kill switch + Shadow mode |
| `supabase/functions/generate-copilot-insights/index.ts` | Modificar | Kill switch |
| `supabase/functions/passive-learning-cron/index.ts` | Modificar | Kill switch + Shadow mode |
| `supabase/config.toml` | Modificar | Adicionar check-ai-anomalies cron |
| `src/App.tsx` | Modificar | Adicionar rota /settings/ai-audit |

---

## Seção Tecnica

### Tabelas Criadas

| Tabela | Propósito |
|--------|-----------|
| `ai_anomaly_logs` | Registro de anomalias detectadas |
| `ai_learning_timeline` | Histórico auditável de aprendizados |

### Configurações em system_configurations

| Key | Valor Padrão | Descrição |
|-----|--------------|-----------|
| `ai_global_enabled` | 'true' | Kill Switch global |
| `ai_shadow_mode` | 'true' | Shadow Mode (ativo por padrão!) |
| `ai_strict_rag_mode` | 'false' | Modo anti-alucinação estrito |

### Cron Jobs

| Função | Schedule | Descrição |
|--------|----------|-----------|
| `check-ai-anomalies` | `0 6 * * *` | 1x/dia às 6h — detecta anomalias |

---

## Critérios de Aceitação

| Teste | Resultado Esperado |
|-------|-------------------|
| Kill Switch desligado | ✅ Toda IA para imediatamente |
| Shadow Mode ativo | ✅ IA sugere mas não aplica nada |
| Anomalia de CSAT detectada | ✅ Registro em ai_anomaly_logs + admin_alert |
| Aprendizado passivo | ✅ Registrado em ai_learning_timeline com status pending |
| Aprovar aprendizado | ✅ Status muda para approved, reviewed_by preenchido |
| Rejeitar aprendizado | ✅ Status muda para rejected, rejection_reason preenchido |
| Prompt anti-alucinação | ✅ IA segue regras estritas |
| Confidence < 60% | ✅ Sugestão não é aplicada automaticamente |

---

## Checklist de Deploy — GO/NO-GO

### Banco
- [ ] Tabelas `ai_anomaly_logs` e `ai_learning_timeline` criadas
- [ ] RLS habilitado em ambas
- [ ] Configuração `ai_shadow_mode` inserida
- [ ] Índices criados para queries frequentes

### Backend
- [ ] Kill Switch verificado em TODAS funções AI
- [ ] Shadow Mode implementado em funções que aplicam dados
- [ ] `check-ai-anomalies` criada e testada
- [ ] Registros em `ai_learning_timeline` funcionando
- [ ] Cron configurado no config.toml

### Frontend
- [ ] Toggle Shadow Mode na página de configurações
- [ ] Tela `/settings/ai-audit` funcionando
- [ ] Aprovar/Rejeitar funcionando
- [ ] Filtros por status e tipo funcionando

### Produto
- [ ] Shadow Mode ATIVO por padrão (segurança primeiro)
- [ ] Nenhuma IA executa ação crítica sem revisão humana
- [ ] Anomalias geram alertas visíveis

---

## Ordem de Implementação

1. **Migração SQL**: Criar tabelas + inserir configurações
2. **Hooks**: Criar useShadowMode e useAILearningTimeline
3. **Backend Kill Switch**: Padronizar em todas funções AI
4. **Backend Shadow Mode**: Implementar lógica de retorno
5. **Backend Anomalias**: Criar check-ai-anomalies + cron
6. **Backend Timeline**: Integrar registro em funções de aprendizado
7. **Frontend Settings**: Adicionar toggle Shadow Mode
8. **Frontend Audit**: Criar página AIAuditPage
9. **Routing**: Adicionar rota no App.tsx
10. **Deploy**: Publicar edge functions
11. **Validação**: Testar todos os critérios

---

## Princípios Inquebráveis (Garantias)

| Princípio | Implementação |
|-----------|---------------|
| IA não executa decisões finais | ✅ Shadow Mode ativo por padrão |
| IA não escreve dados críticos | ✅ Sempre status 'pending' |
| Tudo é desligável | ✅ Kill Switch global |
| Tudo é auditável | ✅ ai_learning_timeline registra tudo |
| Regras > IA | ✅ Detecção de anomalias 100% regras SQL |

---

## Resultado Esperado

**Antes (Fase 5)**:
> "IA funciona e gera insights, mas não temos controle total"

**Depois (Fase 6)**:
> "IA sugere tudo, nada é aplicado sem revisão humana, e temos visibilidade total de anomalias e aprendizados"

Sistema pronto para:
- Produção enterprise
- Compliance e auditoria
- Escalabilidade segura
- Confiança operacional total
