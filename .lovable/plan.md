

# Mensagens Configuráveis de Fora do Horário

## Mensagens Atuais (hardcoded)

**Quando o cliente pede humano fora do horário** (ai-autopilot-chat, linha 7454):
> "Nosso atendimento humano funciona {scheduleSummary}. {nextOpenText} um atendente poderá te ajudar. Enquanto isso, posso continuar tentando por aqui! 😊"

**Quando o horário comercial abre e o cron redistribui** (redistribute-after-hours, linha 163):
> "☀️ Horário comercial iniciado. Um atendente será designado para continuar seu atendimento."

---

## Plano

### 1. Nova tabela: `business_messages_config`

Tabela simples com pares chave/valor para mensagens configuráveis:

```sql
CREATE TABLE public.business_messages_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key text UNIQUE NOT NULL,
  message_template text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seeds com as mensagens atuais
INSERT INTO public.business_messages_config (message_key, message_template, description) VALUES
  ('after_hours_handoff', 'Nosso atendimento humano funciona {schedule}. {next_open} um atendente poderá te ajudar. Enquanto isso, posso continuar tentando por aqui! 😊', 'Mensagem enviada ao cliente quando pede humano fora do horário'),
  ('business_hours_reopened', '☀️ Horário comercial iniciado. Um atendente será designado para continuar seu atendimento.', 'Mensagem enviada quando o horário comercial abre e a conversa é redistribuída');
```

RLS: leitura para authenticated, escrita para admins.

### 2. UI na página de SLA Settings (`src/pages/SLASettings.tsx`)

Nova seção "Mensagens de Fora do Horário" na aba de horário comercial com:
- Textarea para cada mensagem (after_hours_handoff e business_hours_reopened)
- Descrição explicativa de cada uma
- Placeholders disponíveis: `{schedule}`, `{next_open}` (para a mensagem de fora do horário)
- Botão salvar por mensagem

### 3. Hook `useBusinessMessages`

Novo hook em `src/hooks/useBusinessMessages.ts` para CRUD da tabela.

### 4. Edge Functions: buscar mensagem do banco

**`ai-autopilot-chat/index.ts`** (linha 7454): Em vez do texto hardcoded, buscar `after_hours_handoff` da tabela e substituir `{schedule}` e `{next_open}` pelos valores dinâmicos. Fallback para o texto atual se não encontrar.

**`redistribute-after-hours/index.ts`** (linha 163): Buscar `business_hours_reopened` da tabela. Fallback para o texto atual.

### 5. Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| SQL Migration | Criar tabela `business_messages_config` + seeds + RLS |
| `src/pages/SLASettings.tsx` | Nova seção com textareas editáveis |
| `src/hooks/useBusinessMessages.ts` | Novo hook (query + mutation) |
| `supabase/functions/ai-autopilot-chat/index.ts` | Buscar mensagem da tabela (1 query, com fallback) |
| `supabase/functions/redistribute-after-hours/index.ts` | Buscar mensagem da tabela (1 query, com fallback) |

### Sem impacto em features existentes
- Kill Switch, Shadow Mode, Fluxos: não afetados
- Se a tabela estiver vazia ou inacessível, cai no fallback (mensagem atual hardcoded)

