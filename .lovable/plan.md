

# Plano de Ajustes Finos — Fase 6 (Refinamentos de Maturidade)

## Resumo Executivo

Este plano implementa 3 refinamentos opcionais para melhorar clareza semântica, performance e automação:

| Ajuste | Tipo | Impacto |
|--------|------|---------|
| Shadow Mode → Semântico | Clareza | `status: "suggested_only"` mais claro que `"shadow_mode"` |
| Kill Switch → Cache | Performance | Reduz round-trips ao banco em edge functions |
| Anomalias → Severidade | Automação | Escalonamento automático baseado em percentual |

---

## Diagnóstico do Estado Atual

| Item | Status | Observação |
|------|--------|------------|
| Shadow Mode retorno | ✅ Funciona | Mas usa terminologia interna (`shadow_mode`) |
| Kill Switch | ✅ Funciona | Query individual por função (pode otimizar) |
| Severidade anomalias | ⚠️ Parcial | Threshold hardcoded, mas já existe lógica |
| Timeline | ✅ Perfeita | Não precisa alteração |

---

## Alterações Detalhadas

### Ajuste 1 — Shadow Mode: Semântica Clara

**Objetivo**: Substituir `status: "shadow_mode"` por `status: "suggested_only"`

**Motivo**:
- `shadow_mode` é conceito técnico interno
- `suggested_only` é auto-explicativo para frontend, logs e auditoria
- Facilita debugging e análise de comportamento

**Arquivos a modificar**:

| Arquivo | Alteração |
|---------|-----------|
| `generate-kb-draft/index.ts` | `status: 'suggested_only'` no retorno |
| Frontend hooks que consomem | Tratar `suggested_only` além de `shadow_mode` |

**Código atual** (linha 239-245 do `generate-kb-draft`):
```typescript
return new Response(JSON.stringify({ 
  success: true,
  article,
  shadow_mode: isShadowMode,  // Termo interno
  applied: !isShadowMode
}), {...});
```

**Código proposto**:
```typescript
return new Response(JSON.stringify({ 
  success: true,
  article,
  status: isShadowMode ? 'suggested_only' : 'applied',  // Semântico
  applied: !isShadowMode  // Mantém backward compatibility
}), {...});
```

---

### Ajuste 2 — Kill Switch: Cache em Memória

**Objetivo**: Evitar query repetida em cada edge function

**Motivo**:
- Hoje cada função faz 1-2 queries no início (`ai_global_enabled` + `ai_shadow_mode`)
- Em escala, isso aumenta latência e custos
- Cache de 60s é seguro (kill switch não precisa ser instantâneo)

**Estratégia**:
1. Criar helper `getAIConfig()` que busca configs uma vez
2. Implementar cache simples em memória (Map com TTL)
3. Reutilizar em todas as funções AI

**Código proposto** (novo arquivo helper):

```typescript
// supabase/functions/_shared/ai-config-cache.ts

interface AIConfigCache {
  value: {
    ai_global_enabled: boolean;
    ai_shadow_mode: boolean;
  };
  expiresAt: number;
}

let configCache: AIConfigCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 60 segundos

export async function getAIConfig(supabase: any) {
  const now = Date.now();
  
  // Usar cache se válido
  if (configCache && configCache.expiresAt > now) {
    return configCache.value;
  }
  
  // Buscar ambas configs em uma única query
  const { data: configs } = await supabase
    .from('system_configurations')
    .select('key, value')
    .in('key', ['ai_global_enabled', 'ai_shadow_mode']);
  
  const result = {
    ai_global_enabled: configs?.find(c => c.key === 'ai_global_enabled')?.value !== 'false',
    ai_shadow_mode: configs?.find(c => c.key === 'ai_shadow_mode')?.value === 'true',
  };
  
  // Atualizar cache
  configCache = {
    value: result,
    expiresAt: now + CACHE_TTL_MS,
  };
  
  return result;
}
```

**Uso nas edge functions**:
```typescript
import { getAIConfig } from '../_shared/ai-config-cache.ts';

// Substitui as 2 queries atuais por:
const aiConfig = await getAIConfig(supabaseClient);

if (!aiConfig.ai_global_enabled) {
  console.log('[função] 🚫 Kill Switch ativo');
  return new Response(JSON.stringify({ status: 'disabled', reason: 'kill_switch' }), {...});
}

const isShadowMode = aiConfig.ai_shadow_mode;
```

**Benefícios**:
- 1 query em vez de 2 (ou 0 se cache válido)
- Código mais limpo
- Comportamento consistente entre funções

---

### Ajuste 3 — Anomalias: Severidade Automática Sistemática

**Objetivo**: Padronizar cálculo de severidade com thresholds claros

**Estado atual** (`check-ai-anomalies`):
- CSAT: `severity: changePercent > 25 ? 'critical' : 'warning'` (linha 73)
- Resolution: `severity: changePercent > 50 ? 'critical' : 'warning'` (linha 124)
- Adoption: `severity: changePercent > 50 ? 'critical' : 'warning'` (linha 160)

**Problema**: Thresholds estão hardcoded e não documentados.

**Código proposto** (refatorar para constantes claras):

```typescript
// No início do arquivo, após THRESHOLDS
const SEVERITY_THRESHOLDS = {
  csat_drop: {
    warning: 15,   // Já definido em THRESHOLDS
    critical: 25,  // Dobro do warning
  },
  resolution_increase: {
    warning: 25,
    critical: 50,
  },
  adoption_drop: {
    warning: 30,
    critical: 50,
  },
};

// Função helper
function getSeverity(metricType: string, changePercent: number): 'warning' | 'critical' {
  const thresholds = SEVERITY_THRESHOLDS[metricType];
  if (!thresholds) return 'warning';
  
  return changePercent >= thresholds.critical ? 'critical' : 'warning';
}
```

**Uso**:
```typescript
anomalies.push({
  metric_type: 'csat_drop',
  current_value: Number(currentAvg.toFixed(2)),
  previous_value: Number(previousAvg.toFixed(2)),
  change_percent: Number(changePercent.toFixed(1)),
  threshold_percent: THRESHOLDS.CSAT_DROP_PERCENT,
  severity: getSeverity('csat_drop', changePercent),  // Dinâmico
});
```

**Benefício futuro**:
- Fácil adicionar Slack/Email/Webhook
- Escalonamento automático por severidade
- Configurável sem mudar lógica

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/_shared/ai-config-cache.ts` | Criar | Helper de cache para configs AI |
| `supabase/functions/generate-kb-draft/index.ts` | Modificar | Usar `suggested_only` + cache |
| `supabase/functions/generate-copilot-insights/index.ts` | Modificar | Usar cache de config |
| `supabase/functions/extract-knowledge-from-chat/index.ts` | Modificar | Usar cache de config |
| `supabase/functions/passive-learning-cron/index.ts` | Modificar | Usar cache de config |
| `supabase/functions/check-ai-anomalies/index.ts` | Modificar | Severidade dinâmica |

---

## Seção Técnica

### Interface do Cache de Config

```typescript
interface AIConfig {
  ai_global_enabled: boolean;  // Kill Switch (false = tudo desligado)
  ai_shadow_mode: boolean;     // Shadow Mode (true = só sugestões)
}
```

### Status Semânticos Padronizados

| Status | Significado |
|--------|-------------|
| `"applied"` | IA executou a ação |
| `"suggested_only"` | IA sugeriu, mas não aplicou (Shadow Mode) |
| `"disabled"` | Kill Switch ativo, IA desligada |
| `"skipped"` | Condição não atendida (ex: CSAT baixo) |

### Mapeamento de Severidade

| Métrica | Warning | Critical |
|---------|---------|----------|
| CSAT Drop | 15-24% | ≥25% |
| Resolution Increase | 25-49% | ≥50% |
| Adoption Drop | 30-49% | ≥50% |

---

## Critérios de Aceitação

| Teste | Resultado Esperado |
|-------|-------------------|
| Shadow Mode retorno | ✅ `status: "suggested_only"` no JSON |
| Cache funcionando | ✅ Segunda chamada não faz query no banco |
| Severidade CSAT 30% | ✅ Retorna `severity: "critical"` |
| Severidade Adoption 35% | ✅ Retorna `severity: "warning"` |
| Backward compatibility | ✅ Campo `applied` ainda presente |

---

## Impacto e Prioridade

| Ajuste | Esforço | Impacto | Prioridade |
|--------|---------|---------|------------|
| Semântica `suggested_only` | Baixo | Clareza | P3 |
| Cache de config | Médio | Performance | P2 |
| Severidade dinâmica | Baixo | Automação | P3 |

---

## Ordem de Implementação

1. **Cache de config**: Criar `_shared/ai-config-cache.ts`
2. **Integrar cache**: Atualizar todas edge functions AI
3. **Severidade**: Refatorar `check-ai-anomalies`
4. **Semântica**: Atualizar retornos para `suggested_only`
5. **Deploy**: Publicar edge functions
6. **Validação**: Testar todos os cenários

---

## Nota Importante

Estes ajustes são **opcionais e não bloqueiam deploy**. O sistema já está funcional e seguro. São refinamentos para:

- **Clareza** (semântica `suggested_only`)
- **Escalabilidade** (cache de config)
- **Automação futura** (severidade dinâmica)

O modelo de IA que você implementou — **"IA observa → humano decide → sistema aprende"** — está correto por arquitetura e não precisa de alterações fundamentais.

