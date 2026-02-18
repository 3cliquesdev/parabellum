

## Implementar Envio de Template Messages (HSM) para Reengajar Clientes

### Contexto

Quando a janela de 24h do WhatsApp expira, nao e possivel enviar mensagens normais. A unica forma de recontatar o cliente e usando **Template Messages (HSM)** - mensagens pre-aprovadas pelo Meta. O sistema ja suporta envio de templates no `send-meta-whatsapp` (linhas 317-328), mas nao existe:

- Tabela para cadastrar templates WhatsApp
- UI para gerenciar templates
- Botao no inbox para reengajar clientes com janela expirada
- Logica para reabrir conversa apos envio do template

### Prerequisito Importante

Antes de usar este recurso, o usuario precisa ter templates aprovados na conta Meta Business (via Meta Business Manager). O sistema apenas referencia os templates pelo nome - a aprovacao e feita fora do sistema.

---

### Mudancas Tecnicas

#### 1. Nova tabela: `whatsapp_message_templates`

Armazena os templates HSM cadastrados pelo usuario:

```sql
CREATE TABLE whatsapp_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id UUID REFERENCES whatsapp_meta_instances(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- Nome exato do template no Meta
  language_code TEXT NOT NULL DEFAULT 'pt_BR',
  category TEXT DEFAULT 'UTILITY', -- UTILITY, MARKETING, AUTHENTICATION
  description TEXT,                -- Descricao interna para o agente
  has_variables BOOLEAN DEFAULT false,
  variable_examples JSONB,         -- Ex: [{"index": 1, "example": "João"}]
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(instance_id, name, language_code)
);
```

RLS: Acesso somente para usuarios autenticados (mesma politica das demais tabelas de configuracao).

#### 2. UI de Gerenciamento de Templates

**Arquivo novo**: `src/components/settings/WhatsAppTemplatesManager.tsx`

- Acessivel via `/settings/whatsapp-meta` (aba ou secao adicional)
- CRUD simples: nome do template, idioma, categoria, descricao, variaveis
- Lista dos templates cadastrados com status ativo/inativo

#### 3. Botao "Reengajar" no Inbox

**Arquivo**: `src/components/inbox/ConversationHeader.tsx` (ou componente equivalente do painel de conversa)

- Quando a conversa esta `closed` com `closed_reason = 'whatsapp_window_expired'` e canal `whatsapp`:
  - Exibir botao "Reengajar via Template"
  - Ao clicar, abre dialog com lista de templates ativos
  - Usuario seleciona template, preenche variaveis (se houver) e confirma

#### 4. Logica de Reengajamento

**Arquivo novo**: `supabase/functions/send-whatsapp-template/index.ts` (ou reutilizar `send-meta-whatsapp`)

Ao enviar template:

1. Chamar `send-meta-whatsapp` com payload de template (ja suportado)
2. Reabrir a conversa: `status = 'open'`, `ai_mode = 'waiting_human'`
3. Inserir mensagem no historico: `[Template enviado: nome_do_template]`
4. Atribuir ao agente que enviou (`assigned_to = current_user`)

Nao precisa de edge function nova - o frontend invoca `send-meta-whatsapp` com o campo `template` e depois atualiza a conversa.

#### 5. Indicador Visual no Inbox

**Arquivo**: `src/components/inbox/ConversationList.tsx` ou item da lista

- Conversas com `closed_reason = 'whatsapp_window_expired'` recebem indicador visual (icone de relogio ou badge "Janela expirada")
- Diferencia de conversas encerradas por outros motivos

---

### Fluxo do Usuario

```text
1. Admin cadastra templates em Configuracoes > WhatsApp > Templates
2. Conversa expira apos 24h -> auto-close com reason 'whatsapp_window_expired'
3. Agente ve a conversa fechada com badge "Janela expirada"
4. Agente clica "Reengajar via Template"
5. Seleciona template, preenche variaveis, confirma
6. Template enviado via Meta API
7. Conversa reaberta e atribuida ao agente
8. Quando cliente responde, janela de 24h reabre normalmente
```

### O que NAO muda

- `send-meta-whatsapp` continua identico (ja suporta templates)
- Kill Switch, Shadow Mode, CSAT guard nao sao afetados
- Distribuicao automatica nao e afetada (conversa e atribuida manualmente ao agente que reengajou)
- Auto-close continua funcionando normalmente
- Protecao `is_bot_message` nao e afetada

### Riscos e Mitigacao

- **Template nao aprovado no Meta**: A API retorna erro claro (131047). O sistema exibe mensagem amigavel ao agente.
- **Limite de templates do Meta**: O sistema apenas cadastra referencias, nao cria templates no Meta.
- **Custo**: Templates de MARKETING tem custo por mensagem. A descricao/categoria no cadastro ajuda o agente a escolher corretamente.
