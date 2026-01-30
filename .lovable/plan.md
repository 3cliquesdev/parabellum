# Fase 2 — Aprendizado Passivo Controlado

## ✅ Status: IMPLEMENTADO

---

## O que foi implementado

### 1. Banco de Dados ✅

**Novas tabelas criadas:**
- `knowledge_candidates` - Armazena conhecimento extraído ANTES de aprovação
- `knowledge_versions` - Histórico de alterações em artigos da KB

**Colunas adicionadas em `knowledge_articles`:**
- `problem`, `solution`, `when_to_use`, `when_not_to_use`
- `source_conversation_id`, `department_id`, `confidence_score`
- `approved_by`, `approved_at`, `version`

**Trigger de versionamento:** Auto-salva versão antes de updates

---

### 2. Backend (Edge Functions) ✅

**`ai-auto-trainer`:**
- ✅ Critério CSAT >= 4 obrigatório (rejeita conversas sem rating ou rating < 4)
- ✅ Verifica intervenção humana (pelo menos 1 mensagem de agente não-IA)
- ✅ Prompt estruturado com `problem`, `solution`, `when_to_use`, `when_not_to_use`, `tags`
- ✅ Salva em `knowledge_candidates` (NUNCA diretamente na KB)
- ✅ Confidence >= 70 obrigatório (descarta abaixo)

**`extract-knowledge-from-chat`:**
- ✅ Aceita `departmentId` para rastreabilidade
- ✅ Prompt estruturado igual ao ai-auto-trainer
- ✅ Salva em `knowledge_candidates` com status `pending`
- ✅ Notifica gerentes sobre novos candidatos

**`passive-learning-cron`:**
- ✅ Valida CSAT >= 4 antes de processar
- ✅ Marca conversas com CSAT < 4 como "skipped" com motivo

---

### 3. Frontend ✅

**Nova página `/knowledge/curation`:**
- ✅ Lista de candidatos com tabs (Pendentes, Aprovados, Rejeitados, Todos)
- ✅ Cards com problema, solução, when_to_use, when_not_to_use
- ✅ Score de confiança visual (Progress bar + badge)
- ✅ Ações: Aprovar, Editar+Aprovar, Rejeitar
- ✅ Dialog de edição com todos os campos
- ✅ Dialog de rejeição com motivo obrigatório
- ✅ Link para conversa original

**Página `/knowledge` atualizada:**
- ✅ Botão "Curadoria" com badge de pendentes
- ✅ Suporte a `?filter=draft` para filtrar rascunhos

**Hooks criados:**
- `useKnowledgeCandidates` - Lista candidatos com joins
- `useKnowledgeCandidateStats` - Contagem por status
- `useApproveCandidate` - Move para KB + gera embedding
- `useRejectCandidate` - Marca como rejeitado + motivo

---

## Fluxo Completo

```
Conversa Fechada (CSAT >= 4)
         │
         ▼
   ai-auto-trainer OU extract-knowledge-from-chat
         │
         ▼
   Extração com Prompt Estruturado
   (problem, solution, when_to_use, when_not_to_use, tags)
         │
         ▼
   Confidence >= 70?
    │         │
   Sim       Não → Descarta
    │
    ▼
   knowledge_candidates (status: pending)
         │
         ▼
   Painel de Curadoria (/knowledge/curation)
         │
   ┌─────┴─────┐
   │           │
 Aprovar    Rejeitar
   │           │
   ▼           ▼
knowledge_articles   Arquivado
(is_published: true) (rejection_reason salvo)
   │
   ▼
generate-article-embedding
```

---

## Arquivos Criados/Modificados

| Arquivo | Status |
|---------|--------|
| `src/pages/KnowledgeCuration.tsx` | ✅ Criado |
| `src/hooks/useKnowledgeCandidates.tsx` | ✅ Criado |
| `src/hooks/useApproveCandidate.tsx` | ✅ Criado |
| `src/hooks/useRejectCandidate.tsx` | ✅ Criado |
| `src/pages/Knowledge.tsx` | ✅ Atualizado |
| `src/App.tsx` | ✅ Rota adicionada |
| `supabase/functions/ai-auto-trainer/index.ts` | ✅ Atualizado |
| `supabase/functions/extract-knowledge-from-chat/index.ts` | ✅ Atualizado |
| `supabase/functions/passive-learning-cron/index.ts` | ✅ Atualizado |

---

## Garantias de Segurança

- ✅ CSAT >= 4 obrigatório para aprendizado
- ✅ Nada entra na KB sem aprovação humana
- ✅ Histórico de versões mantido automaticamente
- ✅ Auditoria de quem aprovou/rejeitou (reviewed_by, reviewed_at)
- ✅ Link para conversa original preservado

---

## Próximos Passos (Opcionais)

1. **Widget de stats no AI Trainer** - Mostrar candidatos pendentes
2. **Auto-aprovação com threshold alto** - Se confidence > 95, aprovar automaticamente (opcional)
3. **Notificações push** - Alertar gerentes sobre candidatos pendentes
4. **Bulk actions** - Aprovar/rejeitar múltiplos candidatos de uma vez
