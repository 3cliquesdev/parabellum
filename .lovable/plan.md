

## Plano: Correção em Massa de Leads que São Clientes Kiwify

### Situação Atual

Encontrei **78 leads sem email** cujo telefone já existe na base Kiwify como compradores. Esses leads deveriam ser clientes e estar no departamento de Suporte, mas ficaram como leads porque a IA não pediu o email antes do handoff.

### O que precisa ser feito

| Ação | Tabela | Campo |
|------|--------|-------|
| Marcar como cliente | `contacts` | `status = 'customer'` |
| Adicionar email da Kiwify | `contacts` | `email = kiwify_email` |
| Validar Kiwify | `contacts` | `kiwify_validated = true` |
| Mover para Suporte | `conversations` | `department = '36ce66cd-7414-4fc8-bd4a-268fecc3f01a'` |

---

### Solução Proposta

Criar uma nova função RPC no banco que faz a correção completa, e uma Edge Function para executá-la.

#### 1. Nova RPC: `fix_leads_that_are_kiwify_customers`

```sql
CREATE OR REPLACE FUNCTION fix_leads_that_are_kiwify_customers()
RETURNS TABLE(
  contacts_updated integer,
  conversations_updated integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_contacts_updated integer := 0;
  v_conversations_updated integer := 0;
  v_suporte_dept_id uuid := '36ce66cd-7414-4fc8-bd4a-268fecc3f01a';
BEGIN
  -- 1. Criar tabela temporária com leads que têm telefone na Kiwify
  CREATE TEMP TABLE leads_to_fix AS
  WITH kiwify_data AS (
    SELECT DISTINCT ON (RIGHT(REGEXP_REPLACE(payload->'Customer'->>'mobile', '[^0-9]', '', 'g'), 9))
      RIGHT(REGEXP_REPLACE(payload->'Customer'->>'mobile', '[^0-9]', '', 'g'), 9) as last9,
      payload->'Customer'->>'email' as kiwify_email,
      payload->'Customer'->>'full_name' as kiwify_name
    FROM kiwify_events 
    WHERE event_type IN ('paid', 'order_approved', 'subscription_renewed')
      AND payload->'Customer'->>'mobile' IS NOT NULL
    ORDER BY RIGHT(REGEXP_REPLACE(payload->'Customer'->>'mobile', '[^0-9]', '', 'g'), 9), created_at DESC
  )
  SELECT 
    ct.id as contact_id,
    kd.kiwify_email,
    kd.kiwify_name
  FROM contacts ct
  JOIN conversations c ON c.contact_id = ct.id
  JOIN kiwify_data kd ON 
    RIGHT(REGEXP_REPLACE(ct.phone, '[^0-9]', '', 'g'), 9) = kd.last9
  WHERE ct.status = 'lead'
    AND ct.email IS NULL
    AND c.status = 'open';

  -- 2. Atualizar contatos
  UPDATE contacts ct
  SET 
    status = 'customer',
    email = ltf.kiwify_email,
    kiwify_validated = true,
    kiwify_validated_at = now(),
    source = 'kiwify_batch_fix'
  FROM leads_to_fix ltf
  WHERE ct.id = ltf.contact_id;
  
  GET DIAGNOSTICS v_contacts_updated = ROW_COUNT;

  -- 3. Atualizar conversas abertas desses contatos para Suporte
  UPDATE conversations c
  SET department = v_suporte_dept_id
  FROM leads_to_fix ltf
  WHERE c.contact_id = ltf.contact_id
    AND c.status = 'open'
    AND (c.department IS NULL OR c.department != v_suporte_dept_id);
  
  GET DIAGNOSTICS v_conversations_updated = ROW_COUNT;

  -- 4. Limpar tabela temporária
  DROP TABLE leads_to_fix;

  -- 5. Retornar resultado
  RETURN QUERY SELECT v_contacts_updated, v_conversations_updated;
END;
$$;
```

#### 2. Edge Function para Executar

Criar `supabase/functions/fix-leads-kiwify/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[fix-leads-kiwify] Iniciando correção de leads que são clientes Kiwify...");

    const { data, error } = await supabaseClient.rpc('fix_leads_that_are_kiwify_customers');

    if (error) {
      console.error("[fix-leads-kiwify] Erro:", error);
      throw error;
    }

    const result = data?.[0] || { contacts_updated: 0, conversations_updated: 0 };
    
    console.log(`[fix-leads-kiwify] ✅ Contatos: ${result.contacts_updated}, Conversas: ${result.conversations_updated}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        contacts_updated: result.contacts_updated,
        conversations_updated: result.conversations_updated,
        message: `Corrigidos ${result.contacts_updated} contatos e ${result.conversations_updated} conversas`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| Migration SQL | Criar RPC `fix_leads_that_are_kiwify_customers` |
| `supabase/functions/fix-leads-kiwify/index.ts` | Criar Edge Function |
| `supabase/config.toml` | Adicionar configuração da função |

---

### Resultado Esperado

Após executar:

- **78 contatos** terão:
  - `status = 'customer'`
  - `email` preenchido com o email da Kiwify
  - `kiwify_validated = true`
  - `source = 'kiwify_batch_fix'`

- **Conversas abertas** desses contatos:
  - `department = '36ce66cd-7414-4fc8-bd4a-268fecc3f01a'` (Suporte)

---

### Como Executar

Após a implementação, você poderá:

1. Chamar a Edge Function via curl ou interface
2. A função retornará quantos contatos e conversas foram corrigidos
3. Os chats aparecerão no filtro de Suporte

---

### Seção Técnica

**IDs dos Departamentos:**
- Suporte: `36ce66cd-7414-4fc8-bd4a-268fecc3f01a`
- Comercial: `f446e202-bdc3-4bb3-aeda-8c0aa04ee53c`

**Lógica de Match:**
- Compara últimos 9 dígitos do telefone (ignora DDI e formatação)
- Usa o email mais recente da Kiwify para cada telefone

**Segurança:**
- RPC usa `SECURITY DEFINER` para executar com permissões do owner
- Edge Function requer service role key

