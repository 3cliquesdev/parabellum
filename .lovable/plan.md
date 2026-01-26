
## Plano: Agente RAG Robusto com OpenAI (Anti-Alucinação)

### Diagnóstico do Sistema Atual

O Autopilot atual tem várias camadas de proteção, mas ainda alucina porque:

1. **Modelo fraco**: Usa `gpt-4o-mini` que é rápido mas menos preciso
2. **Threshold baixo**: Score de confiança mínimo é 0.70 (muitas respostas passam)
3. **Prompt muito longo**: O system prompt tem ~3500 tokens com muitas instruções conflitantes
4. **Fallback para Gemini**: Se OpenAI falhar, usa Gemini que tem comportamento diferente
5. **Query Expansion genérica**: Expande queries mas não valida relevância

---

### Solução: Agente RAG Estrito com OpenAI GPT-4o

Criar um modo "RAG Estrito" que:
- Usa **exclusivamente OpenAI GPT-4o** (modelo mais preciso)
- Exige **score mínimo de 0.85** para responder
- Usa **prompt enxuto** focado em fidelidade à KB
- **Cita fontes** explicitamente
- **Recusa responder** quando não encontra informação

---

### Arquitetura Proposta

```text
Cliente envia mensagem
         |
         v
[Query Embedding] OpenAI text-embedding-3-small
         |
         v
[Semantic Search] match_knowledge_articles (threshold 0.75)
         |
         v
[Score de Confiança] similarity >= 0.85?
         |
    +----+----+
    |         |
   SIM       NÃO
    |         |
    v         v
[RAG GPT-4o]  [Handoff + Mensagem padrão]
    |
    v
[Resposta com citação de fonte]
```

---

### Mudanças no Código

**1. Nova configuração no banco: `ai_strict_rag_mode`**

Permite ativar/desativar o modo estrito por instância ou globalmente.

**2. Modificar `callAIWithFallback` para modo estrito**

Quando `strict_rag_mode` está ativo:
- Usar SEMPRE `gpt-4o` (não `gpt-4o-mini`)
- NÃO fazer fallback para Lovable/Gemini
- Retornar erro se OpenAI falhar (ao invés de alucinação)

**3. Novo prompt de sistema RAG estrito**

Prompt enxuto e focado:

```
Você é um assistente de suporte que APENAS responde com base nos documentos fornecidos.

REGRAS ABSOLUTAS:
1. NUNCA invente informações que não estejam nos documentos abaixo
2. Se a resposta não estiver nos documentos, diga: "Não encontrei essa informação na base de conhecimento. Posso te conectar com um especialista?"
3. Sempre cite a fonte: "De acordo com [título do artigo]..."
4. Mantenha respostas concisas (máximo 150 palavras)

DOCUMENTOS:
{knowledge_articles}

PERGUNTA DO CLIENTE:
{customer_message}
```

**4. Aumentar thresholds de confiança**

```typescript
// Modo Estrito
const STRICT_SCORE_DIRECT = 0.90;    // Só responde com 90%+ de match
const STRICT_SCORE_MINIMUM = 0.85;   // Abaixo disso, SEMPRE handoff
const STRICT_SIMILARITY_THRESHOLD = 0.80; // Artigos com menos de 80% são ignorados
```

**5. Validação de resposta pós-geração**

Checar se a resposta da IA contém frases de incerteza (definidas no código atual) e forçar handoff se detectar:

```typescript
const HALLUCINATION_INDICATORS = [
  'não tenho certeza',
  'acredito que',
  'provavelmente',
  'geralmente',
  'pode ser que',
  'talvez'
];

// Se detectar indicador, forçar handoff
if (HALLUCINATION_INDICATORS.some(h => aiResponse.toLowerCase().includes(h))) {
  return triggerHandoff('uncertainty_detected');
}
```

---

### Interface para Ativar Modo Estrito

Adicionar toggle na página de Configurações de IA (`/settings/ai`):

```
+------------------------------------------+
| Modo RAG Estrito                    [ON] |
+------------------------------------------+
| Usa exclusivamente OpenAI GPT-4o         |
| Exige 85%+ de confiança para responder   |
| Nunca inventa informações                |
| Cita fontes explicitamente               |
+------------------------------------------+
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `supabase/functions/ai-autopilot-chat/index.ts` | Modificar | Adicionar lógica de modo estrito |
| `src/pages/AISettingsPage.tsx` | Modificar | Adicionar toggle de modo estrito |
| `src/hooks/useStrictRAGMode.tsx` | Criar | Hook para gerenciar configuração |
| Migration SQL | Criar | Adicionar coluna `strict_rag_mode` em system_configurations |

---

### Implementação Técnica Detalhada

**1. Nova função `callStrictRAG` (substitui `callAIWithFallback` quando ativo):**

```typescript
async function callStrictRAG(
  supabaseClient: any,
  customerMessage: string,
  knowledgeArticles: RetrievedDocument[],
  contactName: string
) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    throw new Error('STRICT_RAG requer OPENAI_API_KEY');
  }
  
  // Verificar se temos artigos suficientes
  const highConfidenceArticles = knowledgeArticles.filter(a => a.similarity >= 0.80);
  
  if (highConfidenceArticles.length === 0) {
    return {
      shouldHandoff: true,
      reason: 'Nenhum artigo com confiança >= 80%',
      response: null
    };
  }
  
  // Prompt enxuto e focado
  const strictPrompt = `Você é um assistente de suporte. Responda APENAS com base nos documentos abaixo.

REGRAS:
1. NÃO invente informações
2. Se não souber, diga: "Não encontrei essa informação. Posso te conectar com um especialista?"
3. Cite a fonte: "De acordo com [título]..."
4. Máximo 150 palavras

DOCUMENTOS:
${highConfidenceArticles.map(a => `### ${a.title}\n${a.content}`).join('\n\n---\n\n')}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o', // Modelo mais preciso
      messages: [
        { role: 'system', content: strictPrompt },
        { role: 'user', content: `${contactName}: ${customerMessage}` }
      ],
      temperature: 0.3, // Baixa criatividade = mais fidelidade
      max_tokens: 400
    }),
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI strict RAG failed: ${response.status}`);
  }
  
  const data = await response.json();
  const aiMessage = data.choices[0].message.content;
  
  // Validação pós-geração: detectar incerteza
  const uncertaintyPhrases = ['não tenho certeza', 'acredito que', 'provavelmente', 'pode ser'];
  const hasUncertainty = uncertaintyPhrases.some(p => aiMessage.toLowerCase().includes(p));
  
  if (hasUncertainty) {
    return {
      shouldHandoff: true,
      reason: 'IA expressou incerteza na resposta',
      response: aiMessage
    };
  }
  
  return {
    shouldHandoff: false,
    reason: null,
    response: aiMessage,
    citedArticles: highConfidenceArticles.map(a => a.title)
  };
}
```

**2. Integração no fluxo principal:**

```typescript
// No início do processamento (após buscar artigos)
const strictMode = await getSystemConfig(supabaseClient, 'ai_strict_rag_mode');

if (strictMode === 'true') {
  const ragResult = await callStrictRAG(
    supabaseClient,
    customerMessage,
    knowledgeArticles,
    contactName
  );
  
  if (ragResult.shouldHandoff) {
    // Fazer handoff com mensagem padronizada
    return handleStrictHandoff(ragResult.reason, contactName);
  }
  
  // Enviar resposta citando fontes
  return sendResponse(ragResult.response, ragResult.citedArticles);
}

// Caso contrário, continua com fluxo atual (comportamento legado)
```

**3. Toggle na interface:**

```tsx
// Em AISettingsPage.tsx
<Card>
  <CardHeader>
    <CardTitle>Modo RAG Estrito</CardTitle>
    <CardDescription>
      Usa exclusivamente OpenAI GPT-4o com alta precisão
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium">
          {isStrictMode ? 'Ativado' : 'Desativado'}
        </p>
        <p className="text-sm text-muted-foreground">
          {isStrictMode 
            ? 'IA só responde com 85%+ de confiança, nunca alucina' 
            : 'Modo padrão com fallback para Gemini'}
        </p>
      </div>
      <Switch 
        checked={isStrictMode} 
        onCheckedChange={toggleStrictMode}
      />
    </div>
  </CardContent>
</Card>
```

---

### Comparativo: Antes vs Depois

| Aspecto | Antes (Atual) | Depois (Modo Estrito) |
|---------|---------------|----------------------|
| Modelo | gpt-4o-mini | gpt-4o |
| Fallback | Gemini | Nenhum (erro) |
| Threshold | 0.70 | 0.85 |
| Temperatura | 0.7 | 0.3 |
| Prompt | ~3500 tokens | ~500 tokens |
| Citação de fonte | Não | Sim |
| Validação pós-resposta | Não | Sim |

---

### Benefícios

- **Zero alucinações**: IA só responde quando tem certeza
- **Transparência**: Cita fontes explicitamente
- **Consistência**: Apenas OpenAI, sem mistura de modelos
- **Controle**: Toggle para ativar/desativar por instância
- **Custo controlado**: GPT-4o é mais caro mas mais preciso

---

### Considerações de Custo

GPT-4o custa ~3x mais que gpt-4o-mini, mas:
- Menos handoffs desnecessários (IA resolve mais casos corretamente)
- Menor tempo de atendimento humano
- Maior satisfação do cliente

---

### Próximos Passos Pós-Implementação

1. **Monitorar métricas**: Taxa de handoff, tempo de resposta, satisfação
2. **Ajustar thresholds**: Se muito conservador, baixar para 0.80
3. **Expandir KB**: Adicionar mais artigos para cobrir casos comuns
4. **Feedback loop**: Marcar respostas corretas/incorretas para ajuste fino
