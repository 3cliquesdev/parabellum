

## Plano: Resolver 3 Problemas Criticos do Chat

### Diagnostico dos Logs

Analisei os logs recentes e encontrei:

```
[ai-autopilot-chat] 📧 Resultado verify-customer-email: {
  error: FunctionsHttpError: Edge Function returned a non-2xx status code
  status: 404, statusText: "Not Found"
```

A Edge Function `verify-customer-email` nao existe no projeto mas o Autopilot tenta chama-la. Isso explica porque emails sao detectados mas nao processados corretamente.

---

### Parte 1: Criar Edge Function verify-customer-email

Criar `supabase/functions/verify-customer-email/index.ts`:

**Logica:**
1. Receber email e contact_id
2. Buscar contato na tabela `contacts` pelo email
3. Se encontrar contato com `status = 'customer'`:
   - Retornar `{ found: true, customer: {...} }`
4. Se nao encontrar ou nao for customer:
   - Retornar `{ found: false }`

Exemplo de codigo:
```typescript
// Verifica se email pertence a um cliente existente
const { data: customer } = await supabase
  .from('contacts')
  .select('id, email, first_name, last_name, status')
  .eq('email', email.toLowerCase().trim())
  .eq('status', 'customer')
  .maybeSingle();

if (customer) {
  return { found: true, customer };
} else {
  return { found: false };
}
```

---

### Parte 2: Corrigir Fluxo Pre-Carnaval (Match Exato)

O fluxo tem trigger:
```
"Olá vim pelo email e gostaria de saber da promoção de pré carnaval"
```

Voce quer que seja ativado **apenas quando a mensagem for igual ou muito similar ao trigger** (match exato).

**Problema atual:** A logica de "essential keywords" requer 2+ palavras essenciais, mas o cliente pode escrever a frase exata e nao ativar.

**Solucao:** Para triggers muito longos, adicionar match de similaridade alta (90%+) ou adicionar keywords curtas ao fluxo.

**Opcao recomendada:** Atualizar o `trigger_keywords` do fluxo para incluir keywords curtas:

```sql
UPDATE chat_flows 
SET trigger_keywords = '["promoção pré carnaval", "pré carnaval", "promocao pre carnaval", "vim pelo email promoção", "email promocao carnaval"]'
WHERE id = 'adb17db7-d0ba-48c1-b30d-90724353706e';
```

E tambem modificar `process-chat-flow/index.ts` para adicionar Match 4 (match exato de 90%+ similaridade para frases longas):

```typescript
// Match 4: Similaridade ALTA (90%+) para triggers muito longos
if (triggerNorm.length > 50) {
  const triggerWords = triggerNorm.split(/\s+/);
  const messageWords = messageNorm.split(/\s+/);
  const matchedCount = triggerWords.filter(w => messageWords.includes(w)).length;
  const similarity = matchedCount / Math.max(triggerWords.length, messageWords.length);
  
  if (similarity >= 0.9) {
    console.log('[process-chat-flow] ✅ Match EXATO (90%+ similaridade)');
    matchedFlow = flow;
    break;
  }
}
```

---

### Parte 3: Backfill de Emails nas Conversas

Criar funcao SQL que varre todas as mensagens com "@" e verifica se o email existe na base de clientes.

**Logica:**
1. Buscar mensagens `sender_type = 'contact'` que contem "@"
2. Extrair email via regex
3. Verificar se email existe em `contacts` com `status = 'customer'`
4. Se sim:
   - Atualizar o contato da conversa com esse email
   - Mover conversa para Suporte
   - Marcar contato como customer

```sql
CREATE OR REPLACE FUNCTION backfill_emails_from_messages()
RETURNS TABLE(
  emails_found integer,
  contacts_updated integer,
  conversations_moved integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_emails_found integer := 0;
  v_contacts_updated integer := 0;
  v_conversations_moved integer := 0;
  v_suporte_dept_id uuid := '36ce66cd-7414-4fc8-bd4a-268fecc3f01a';
  r RECORD;
BEGIN
  -- Loop por mensagens com @ que sao de contatos
  FOR r IN 
    SELECT DISTINCT ON (m.conversation_id)
      m.conversation_id,
      m.content,
      c.id as contact_id,
      c.email as current_email,
      c.status as current_status,
      -- Extrair email da mensagem
      (regexp_matches(LOWER(m.content), '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'))[1] as extracted_email
    FROM messages m
    JOIN conversations cv ON cv.id = m.conversation_id
    JOIN contacts c ON c.id = cv.contact_id
    WHERE m.sender_type = 'contact'
      AND m.content LIKE '%@%'
      AND c.email IS NULL  -- Contato ainda nao tem email
    ORDER BY m.conversation_id, m.created_at DESC
  LOOP
    v_emails_found := v_emails_found + 1;
    
    -- Verificar se email existe em outro contato com status customer
    IF EXISTS (
      SELECT 1 FROM contacts 
      WHERE email = r.extracted_email 
      AND status = 'customer'
    ) THEN
      -- Email pertence a cliente existente - atualizar contato atual
      UPDATE contacts 
      SET 
        email = r.extracted_email,
        status = 'customer',
        source = COALESCE(source, 'backfill_email')
      WHERE id = r.contact_id;
      
      v_contacts_updated := v_contacts_updated + 1;
      
      -- Mover conversa para Suporte
      UPDATE conversations 
      SET department = v_suporte_dept_id
      WHERE id = r.conversation_id
        AND (department IS NULL OR department != v_suporte_dept_id);
      
      IF FOUND THEN
        v_conversations_moved := v_conversations_moved + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_emails_found, v_contacts_updated, v_conversations_moved;
END;
$$;
```

---

### Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| `supabase/functions/verify-customer-email/index.ts` | Criar | Nova Edge Function para verificar email |
| `supabase/functions/process-chat-flow/index.ts` | Modificar | Adicionar match exato (90%+) para triggers longos |
| Migration SQL | Criar | Funcao backfill_emails_from_messages |
| Data Update SQL | Executar | Atualizar trigger_keywords do Fluxo Carnaval |
| `supabase/config.toml` | Modificar | Adicionar verify-customer-email |

---

### Ordem de Execucao

1. Criar Edge Function `verify-customer-email`
2. Atualizar `supabase/config.toml`
3. Deploy da Edge Function
4. Modificar `process-chat-flow` para match exato
5. Executar UPDATE no trigger_keywords do Fluxo Carnaval
6. Criar funcao SQL de backfill
7. Executar backfill (via RPC ou Edge Function wrapper)

---

### Secao Tecnica: Detalhes

**verify-customer-email/index.ts:**
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { email, contact_id, conversationId, contactId } = await req.json();
    const targetEmail = email?.toLowerCase().trim();
    const targetContactId = contact_id || contactId;
    
    if (!targetEmail) {
      return new Response(
        JSON.stringify({ found: false, error: 'Email not provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-customer-email] Verificando:', targetEmail);

    // Buscar cliente existente pelo email
    const { data: customer, error } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name, status, phone')
      .eq('email', targetEmail)
      .eq('status', 'customer')
      .maybeSingle();

    if (error) {
      console.error('[verify-customer-email] Erro:', error);
      throw error;
    }

    if (customer) {
      console.log('[verify-customer-email] ✅ Cliente encontrado:', customer.email);
      return new Response(
        JSON.stringify({ 
          found: true, 
          customer: {
            id: customer.id,
            email: customer.email,
            name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
            phone: customer.phone
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-customer-email] ❌ Email nao encontrado como customer');
    return new Response(
      JSON.stringify({ found: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[verify-customer-email] Exception:', err);
    return new Response(
      JSON.stringify({ found: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### Resultado Esperado

| Problema | Antes | Depois |
|----------|-------|--------|
| verify-customer-email | 404 Not Found | Funciona, verifica email na base |
| Fluxo Pre-Carnaval | Nao dispara (falta keywords essenciais) | Dispara com match exato ou keywords curtas |
| Emails em mensagens | Ignorados | Backfill marca como customer + move Suporte |

