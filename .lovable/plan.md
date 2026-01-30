

# Plano de Implementação: Fase 3 — IA Observadora / Copiloto Interno

## Resumo Executivo

Esta fase implementa o sistema de IA Observadora que funciona exclusivamente como **copiloto interno silencioso**. A IA analisa conversas e gera sugestões estruturadas para agentes humanos sem jamais interagir diretamente com clientes.

---

## Diagnóstico do Estado Atual

| Componente | Status | Observação |
|------------|--------|------------|
| `ai_suggestions` table | ✅ Existe | Possui `suggested_reply`, falta `suggestion_type`, `confidence_score`, `classification` |
| `generate-smart-reply` | ✅ Existe | Gera apenas reply simples, não usa prompt estruturado Fase 3 |
| `CopilotSuggestionCard` | ✅ Existe | Exibe apenas replies, não mostra KB Gap ou Classification |
| `CopilotPanel` | ✅ Existe | UI básica para sugestões |
| Detecção KB Gap | ❌ Não existe | Precisa criar |
| Classificação automática | ❌ Não existe | Precisa criar |
| Prompt Observador | ❌ Não existe | Precisa implementar prompt da Fase 3 |

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    MODO COPILOT ATIVO                                │
│  (ai_mode = 'copilot' OU mensagem chega em conversa atribuída)       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│               generate-smart-reply (Edge Function)                   │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │              PROMPT OBSERVADOR (FASE 3)                      │    │
│  │  - Analisa histórico + KB + departamento                    │    │
│  │  - NÃO fala com cliente                                      │    │
│  │  - Retorna JSON estruturado                                  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                │                                      │
│                                ▼                                      │
│               ┌────────────────┼────────────────┐                    │
│               ▼                ▼                ▼                    │
│         ┌─────────┐      ┌──────────┐     ┌──────────────┐          │
│         │  REPLY  │      │  KB_GAP  │     │CLASSIFICATION│          │
│         │ Sugestão│      │  Lacuna  │     │  Relatório   │          │
│         └────┬────┘      └────┬─────┘     └──────┬───────┘          │
│              │                │                  │                   │
└──────────────┼────────────────┼──────────────────┼───────────────────┘
               │                │                  │
               ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        ai_suggestions                                │
│  - suggestion_type: 'reply' | 'kb_gap' | 'classification'           │
│  - confidence_score: 0-100                                          │
│  - suggested_reply / kb_gap_description / classification_label      │
└───────────────────────────────────┬─────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
         ┌──────────────────┐ ┌──────────────┐ ┌────────────────────┐
         │  CopilotPanel    │ │ KB Gap Alert │ │ Analytics/Reports  │
         │  (Agente vê)     │ │ (Gestores)   │ │ (Dashboard)        │
         └──────────────────┘ └──────────────┘ └────────────────────┘
```

---

## Alterações Detalhadas

### 1. Migração SQL: Expandir `ai_suggestions`

Adicionar colunas para suportar os 3 tipos de sugestão:

```sql
-- Expandir ai_suggestions para Fase 3
ALTER TABLE public.ai_suggestions
  ADD COLUMN IF NOT EXISTS suggestion_type TEXT DEFAULT 'reply' 
    CHECK (suggestion_type IN ('reply', 'kb_gap', 'classification')),
  ADD COLUMN IF NOT EXISTS confidence_score INTEGER DEFAULT 0 
    CHECK (confidence_score >= 0 AND confidence_score <= 100),
  ADD COLUMN IF NOT EXISTS classification_label TEXT,
  ADD COLUMN IF NOT EXISTS kb_gap_description TEXT;

-- Índice para buscar por tipo
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_type 
  ON ai_suggestions(suggestion_type);

-- Índice para KB Gaps pendentes (para gestores)
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_kb_gaps 
  ON ai_suggestions(suggestion_type, created_at DESC) 
  WHERE suggestion_type = 'kb_gap';
```

### 2. Edge Function: `generate-smart-reply` (Refatoração Completa)

**Arquivo:** `supabase/functions/generate-smart-reply/index.ts`

Implementar o prompt do Observador:

```typescript
const OBSERVER_PROMPT = `Você é um ANALISTA INTERNO DE ATENDIMENTO.
Seu papel é OBSERVAR conversas e GERAR SUGESTÕES para agentes humanos.

⚠️ REGRAS ABSOLUTAS (NUNCA QUEBRE):
- Você NÃO fala com o cliente.
- Você NÃO envia mensagens.
- Você NÃO executa ações.
- Você NÃO altera status de conversa.
- Você NÃO cria tickets, fluxos ou decisões.
- Você NÃO decide nada sozinho.

Você APENAS:
1. Sugere respostas para o agente
2. Identifica lacunas de conhecimento (KB Gap)
3. Classifica o tipo de problema para fins analíticos

---

## 📥 CONTEXTO DISPONÍVEL
Você receberá:
- Histórico recente da conversa
- Base de Conhecimento APROVADA
- Departamento da conversa
- Status da conversa (aberta ou fechada)

---

## 🎯 OBJETIVOS

### 1️⃣ SUGESTÃO DE RESPOSTA (reply)
Se existir uma resposta clara baseada na KB ou padrão histórico:
- Gere uma sugestão curta e profissional
- Não use emojis
- Não faça perguntas
- Não ofereça opções
- Não mencione processos internos

Formato:
"Explique objetivamente X conforme política Y."

---

### 2️⃣ DETECÇÃO DE LACUNA DE CONHECIMENTO (kb_gap)
Se o problema:
- Aparece no atendimento
- NÃO existe na KB
- Foi resolvido manualmente

Então gere um alerta de lacuna:
"Este tipo de problema não possui artigo na KB."

⚠️ Não invente solução.

---

### 3️⃣ CLASSIFICAÇÃO INTERNA (classification)
Classifique a conversa apenas para relatórios internos.

Exemplos:
- "Rastreio / Logística"
- "Financeiro / Reembolso"
- "Erro de Etiqueta"
- "Configuração Inicial"
- "Exceção Operacional"

---

## 📤 FORMATO DE RESPOSTA (OBRIGATÓRIO)
Responda SEMPRE em JSON válido.

{
  "suggestions": [
    {
      "type": "reply | kb_gap | classification",
      "content": "Texto da sugestão",
      "confidence_score": 0-100
    }
  ]
}

---

## 🛑 RESTRIÇÕES CRÍTICAS
- Se NÃO houver sugestão útil → retorne lista vazia
- NÃO repita informações já existentes na KB
- NÃO gere múltiplas sugestões redundantes
- NÃO seja prolixo
- NÃO explique seu raciocínio
- NÃO use linguagem conversacional

---

## 🧯 FALLBACK OBRIGATÓRIO
Se não houver contribuição clara:

{
  "suggestions": []
}`;

// Fluxo principal
async function generateObserverSuggestions(
  conversationId: string,
  messages: Message[],
  kbArticles: Article[],
  department: string | null
): Promise<ObserverResponse> {
  // 1. Construir contexto
  const conversationContext = messages.map(m => 
    `${m.sender_type === 'customer' ? 'Cliente' : 'Agente'}: ${m.content}`
  ).join('\n');
  
  const kbContext = kbArticles.map(a => 
    `- ${a.title}: ${a.content.substring(0, 200)}...`
  ).join('\n');

  // 2. Chamar IA com prompt estruturado
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'openai/gpt-5-mini',
      messages: [
        { role: 'system', content: OBSERVER_PROMPT },
        { 
          role: 'user', 
          content: `## Contexto da Conversa:
${conversationContext}

## Base de Conhecimento Disponível:
${kbContext || 'Nenhum artigo relevante encontrado.'}

## Departamento:
${department || 'Não definido'}

Analise e gere suas sugestões em JSON.`
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 500
    }),
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}
```

### 3. Hook: `useCopilotSuggestions` (Novo)

**Arquivo:** `src/hooks/useCopilotSuggestions.tsx`

Hook que busca todas as sugestões por tipo:

```typescript
export function useCopilotSuggestions(conversationId: string | null) {
  return useQuery({
    queryKey: ['copilot-suggestions', conversationId],
    queryFn: async () => {
      if (!conversationId) return { replies: [], kbGaps: [], classifications: [] };

      const { data, error } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('used', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return {
        replies: (data || []).filter(s => s.suggestion_type === 'reply'),
        kbGaps: (data || []).filter(s => s.suggestion_type === 'kb_gap'),
        classifications: (data || []).filter(s => s.suggestion_type === 'classification'),
      };
    },
    enabled: !!conversationId,
  });
}
```

### 4. Componente: `CopilotSuggestionCard` (Refatoração)

**Arquivo:** `src/components/CopilotSuggestionCard.tsx`

Expandir para exibir os 3 tipos de sugestão:

```typescript
export default function CopilotSuggestionCard({ 
  conversationId, 
  onUseSuggestion 
}: CopilotSuggestionCardProps) {
  const { data, isLoading } = useCopilotSuggestions(conversationId);
  
  return (
    <div className="space-y-2">
      {/* Sugestões de Resposta */}
      {data?.replies.map((reply) => (
        <Card key={reply.id} className="p-4 bg-violet-50 border-violet-200">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-violet-600" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">Sugestão de Resposta</span>
                <Badge variant="outline" className="text-xs">
                  {reply.confidence_score}% confiança
                </Badge>
              </div>
              <p className="text-sm">{reply.suggested_reply}</p>
              <Button size="sm" onClick={() => onUseSuggestion(reply.suggested_reply)}>
                Usar
              </Button>
            </div>
          </div>
        </Card>
      ))}
      
      {/* Alertas de KB Gap */}
      {data?.kbGaps.map((gap) => (
        <Card key={gap.id} className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div className="flex-1">
              <span className="text-sm font-medium text-amber-800">
                Lacuna de Conhecimento Detectada
              </span>
              <p className="text-sm text-amber-700">{gap.kb_gap_description}</p>
            </div>
          </div>
        </Card>
      ))}
      
      {/* Classificação (sutil, apenas informativo) */}
      {data?.classifications[0] && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Tag className="h-3 w-3" />
          <span>Classificação: {data.classifications[0].classification_label}</span>
        </div>
      )}
    </div>
  );
}
```

### 5. Página: KB Gaps Dashboard (Nova)

**Arquivo:** `src/pages/KBGapsDashboard.tsx`

Painel para gestores visualizarem lacunas detectadas:

```typescript
export default function KBGapsDashboard() {
  const { data: gaps, isLoading } = useQuery({
    queryKey: ['kb-gaps-dashboard'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_suggestions')
        .select(`
          *,
          conversations:conversation_id (
            id,
            department,
            contact:contact_id (first_name, last_name)
          )
        `)
        .eq('suggestion_type', 'kb_gap')
        .order('created_at', { ascending: false })
        .limit(50);
      return data;
    },
  });

  return (
    <Layout>
      <div className="container py-6">
        <h1>Lacunas de Conhecimento Detectadas</h1>
        <Table>
          {gaps?.map((gap) => (
            <TableRow key={gap.id}>
              <TableCell>{gap.kb_gap_description}</TableCell>
              <TableCell>{gap.conversations?.contact?.first_name}</TableCell>
              <TableCell>
                <Button asChild>
                  <Link to={`/knowledge/new?from_gap=${gap.id}`}>
                    Criar Artigo
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </div>
    </Layout>
  );
}
```

### 6. Integração com `message-listener`

**Arquivo:** `supabase/functions/message-listener/index.ts`

Quando em modo `copilot`, disparar `generate-smart-reply` automaticamente:

```typescript
// Após verificar ai_mode === 'copilot'
if (conversation?.ai_mode === 'copilot') {
  console.log('[message-listener] 🧠 Modo Copilot - gerando sugestões...');
  
  // Disparar geração de sugestões em background (não bloqueia resposta)
  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/generate-smart-reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      conversationId: record.conversation_id,
      maxMessages: 15,
      includeKBSearch: true
    })
  }).catch(err => console.error('[message-listener] Erro ao gerar sugestões:', err));
  
  return new Response(JSON.stringify({ 
    status: 'copilot_suggestion_triggered' 
  }), { headers: corsHeaders });
}
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| Migração SQL | Criar | Expandir `ai_suggestions` com novos campos |
| `supabase/functions/generate-smart-reply/index.ts` | Modificar | Implementar prompt Observador + JSON estruturado |
| `supabase/functions/message-listener/index.ts` | Modificar | Disparar sugestões em modo copilot |
| `src/hooks/useCopilotSuggestions.tsx` | Criar | Hook para buscar sugestões por tipo |
| `src/components/CopilotSuggestionCard.tsx` | Modificar | Exibir 3 tipos de sugestão |
| `src/pages/KBGapsDashboard.tsx` | Criar | Dashboard de lacunas para gestores |
| `src/App.tsx` | Modificar | Adicionar rota `/knowledge/gaps` |
| `src/components/settings/AITrainerStatsWidget.tsx` | Modificar | Mostrar contagem de KB Gaps |

---

## Fluxo de Dados

```text
1. Mensagem do cliente chega
   ↓
2. message-listener detecta ai_mode = 'copilot'
   ↓
3. Dispara generate-smart-reply (background)
   ↓
4. Edge Function:
   a. Busca últimas 15 mensagens
   b. Faz busca semântica na KB
   c. Envia para IA com OBSERVER_PROMPT
   d. Parseia JSON de resposta
   ↓
5. Salva em ai_suggestions (1-3 registros por chamada)
   ↓
6. Frontend atualiza via React Query
   ↓
7. Agente vê sugestões no CopilotSuggestionCard
8. Gestores veem KB Gaps no Dashboard
9. Analytics recebe classifications
```

---

## Garantias de Segurança (Zero Autonomia)

| Regra | Implementação |
|-------|---------------|
| IA não fala com cliente | ✅ Prompt explícito + response_format JSON |
| IA não executa ações | ✅ Apenas gera sugestões para humano |
| IA não altera status | ✅ Edge function só faz INSERT em ai_suggestions |
| IA não decide transferência | ✅ Removido do prompt, só sugere |
| Fallback seguro | ✅ `{ "suggestions": [] }` quando sem contribuição |
| Determinístico | ✅ JSON estruturado, parseado e validado |

---

## Critérios de Aceitação

| Teste | Resultado Esperado |
|-------|-------------------|
| Nova mensagem em Copilot | ✅ Gera sugestões automaticamente |
| Sugestão de reply | ✅ Aparece no card com botão "Usar" |
| KB Gap detectado | ✅ Card âmbar com alerta visível |
| Classification | ✅ Label sutil abaixo das sugestões |
| Dashboard de gaps | ✅ Lista todos os gaps para gestores |
| JSON inválido da IA | ✅ Fallback para lista vazia |
| Modo Autopilot | ❌ Não dispara generate-smart-reply |

---

## Ordem de Implementação

1. **Migração SQL**: Expandir `ai_suggestions` com novos campos
2. **Backend**: Refatorar `generate-smart-reply` com prompt Observador
3. **Backend**: Atualizar `message-listener` para disparar em copilot
4. **Frontend**: Criar `useCopilotSuggestions` hook
5. **Frontend**: Refatorar `CopilotSuggestionCard` para 3 tipos
6. **Frontend**: Criar `KBGapsDashboard` página
7. **Frontend**: Adicionar rota e links no menu
8. **Deploy**: Publicar edge functions

---

## Métricas de Sucesso

- **Taxa de uso de sugestões**: % de replies usados pelos agentes
- **Precisão de KB Gaps**: Gaps que resultaram em novos artigos
- **Cobertura de classificação**: % de conversas classificadas
- **Tempo de resposta**: Latência do generate-smart-reply < 3s

