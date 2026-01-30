

# Plano de Upgrades Opcionais — Fase 5 (Future-Proof)

## Resumo Executivo

Este plano implementa 2 upgrades opcionais para aumentar rastreabilidade e auditoria da Fase 5:

- **Opcional 1**: Versão do Health Score — permite comparar evolução histórica mesmo após mudança de fórmula
- **Opcional 2**: Snapshot de insights críticos — auditoria e compliance de riscos detectados
- **Opcional 3**: ✅ Já implementado (thresholds visuais: <40 vermelho, 40-70 amarelo, ≥70 verde)

---

## Diagnóstico do Estado Atual

| Ajuste | Status | Impacto |
|--------|--------|---------|
| Versão do Health Score | ❌ Falta | Impossível comparar scores com fórmulas diferentes |
| Snapshot de insights críticos | ❌ Falta | Sem histórico de riscos para auditoria |
| Thresholds visuais | ✅ Implementado | Cores por faixa funcionando |

---

## Alterações Detalhadas

### Opcional 1 — Versão do Health Score

**Objetivo**: Permitir rastreabilidade quando a fórmula mudar no futuro

**Migração SQL** — Atualizar RPC `get_copilot_health_score`:

```sql
-- Adicionar coluna de versão na RETURNS TABLE:
health_score_version TEXT   -- Ex: 'v1', 'v2'

-- No SELECT final:
'v1'::text as health_score_version
```

**Frontend** — Atualizar interface TypeScript:

```typescript
interface CopilotHealthScore {
  // ... campos existentes ...
  health_score_version: string;  // 'v1', 'v2', etc.
}
```

**Uso futuro**:
- Quando mudar pesos (ex: CSAT 30% em vez de 25%), criar 'v2'
- Dashboard pode mostrar: "Score calculado com fórmula v1"
- Permite comparar evolução histórica corretamente

---

### Opcional 2 — Snapshot de Insights Críticos

**Objetivo**: Manter histórico de warnings para auditoria e compliance

**Migração SQL** — Criar tabela `copilot_insights_events`:

```sql
CREATE TABLE IF NOT EXISTS public.copilot_insights_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL,                    -- 'positive', 'warning', 'opportunity'
  title TEXT NOT NULL,
  description TEXT,
  action TEXT,
  confidence TEXT DEFAULT 'alta',
  health_score_at_time NUMERIC,
  total_conversations_at_time INTEGER,
  department_id UUID REFERENCES departments(id),
  source TEXT DEFAULT 'ai',                      -- 'ai', 'fallback'
  health_score_version TEXT DEFAULT 'v1',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: apenas leitura autenticada (gestores)
ALTER TABLE copilot_insights_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read insight events"
  ON copilot_insights_events FOR SELECT
  TO authenticated
  USING (true);

-- Índices para consultas de auditoria
CREATE INDEX idx_insight_events_type ON copilot_insights_events(insight_type);
CREATE INDEX idx_insight_events_created ON copilot_insights_events(created_at DESC);
CREATE INDEX idx_insight_events_department ON copilot_insights_events(department_id);
```

**Edge Function** — Atualizar `generate-copilot-insights`:

Após gerar insights, salvar apenas os do tipo `warning`:

```typescript
// Salvar warnings para auditoria
const warnings = insights.filter(i => i.type === 'warning');

if (warnings.length > 0) {
  await supabaseClient
    .from('copilot_insights_events')
    .insert(
      warnings.map(w => ({
        insight_type: w.type,
        title: w.title,
        description: w.description,
        action: w.action,
        confidence: w.confidence,
        health_score_at_time: healthScore?.health_score,
        total_conversations_at_time: totalConversations,
        department_id: departmentId,
        source: 'ai',
        health_score_version: 'v1'
      }))
    );
}
```

**Uso futuro**:
- Consulta: "Quais riscos foram detectados nos últimos 90 dias?"
- Compliance e auditoria interna
- Análise de tendências de problemas

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Adicionar versão no RPC + criar tabela eventos |
| `src/hooks/useCopilotHealthScore.tsx` | Modificar | Adicionar `health_score_version` na interface |
| `src/components/copilot/HealthScoreGauge.tsx` | Modificar | Exibir versão (opcional, tooltip) |
| `supabase/functions/generate-copilot-insights/index.ts` | Modificar | Salvar warnings na tabela de eventos |

---

## Seção Técnica

### Nova Interface TypeScript — CopilotHealthScore

```typescript
export interface CopilotHealthScore {
  // ... campos existentes ...
  health_score_version: string;  // 'v1'
}
```

### Esquema da Tabela copilot_insights_events

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID | PK |
| `insight_type` | TEXT | 'warning' (só salvamos warnings) |
| `title` | TEXT | Título do insight |
| `description` | TEXT | Descrição do padrão |
| `action` | TEXT | Ação sugerida |
| `confidence` | TEXT | 'alta' ou 'média' |
| `health_score_at_time` | NUMERIC | Score no momento |
| `total_conversations_at_time` | INTEGER | Volume de dados |
| `department_id` | UUID | Departamento (nullable) |
| `source` | TEXT | 'ai' ou 'fallback' |
| `health_score_version` | TEXT | 'v1' |
| `created_at` | TIMESTAMPTZ | Timestamp do evento |

### Consulta de Auditoria (exemplo)

```sql
-- Riscos detectados nos últimos 90 dias
SELECT 
  created_at,
  title,
  description,
  action,
  confidence,
  health_score_at_time
FROM copilot_insights_events
WHERE insight_type = 'warning'
  AND created_at > now() - INTERVAL '90 days'
ORDER BY created_at DESC;
```

---

## Critérios de Aceitação

| Teste | Resultado Esperado |
|-------|-------------------|
| Ver Health Score | ✅ Retorna `health_score_version: 'v1'` |
| Insight warning gerado | ✅ Salvo em `copilot_insights_events` |
| Consultar auditoria | ✅ Lista warnings dos últimos 90 dias |
| Mudar fórmula no futuro | ✅ Basta atualizar para 'v2' no RPC |

---

## Ordem de Implementação

1. **Migração SQL**: Adicionar versão no RPC + criar tabela eventos
2. **Frontend**: Atualizar interface TypeScript
3. **Backend**: Atualizar edge function para salvar warnings
4. **Deploy**: Publicar edge functions
5. **Teste**: Validar auditoria funcional

---

## Resultado Esperado

**Antes**:
> "Mudamos a fórmula do score, como comparar com meses anteriores?"

**Depois**:
> "Histórico marcado como v1, novo cálculo é v2 — comparação segura"

**Antes**:
> "Quais riscos foram detectados nos últimos 90 dias?"

**Depois**:
> Consulta SQL simples retorna todos os warnings com contexto

---

## Nota

O **Opcional 3 (Threshold visual)** já está implementado em `HealthScoreGauge.tsx`:

```typescript
const getScoreColor = (value: number) => {
  if (value >= 70) return "hsl(var(--chart-2))"; // Verde
  if (value >= 40) return "hsl(var(--chart-4))"; // Amarelo
  return "hsl(var(--destructive))";              // Vermelho
};
```

Nenhuma alteração necessária para este item.

