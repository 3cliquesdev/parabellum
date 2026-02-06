import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Manager roles that can send tests to any email
const MANAGER_ROLES = ['admin', 'manager', 'general_manager', 'support_manager', 'cs_manager', 'financial_manager'];

interface TestPlaybookRequest {
  playbook_id: string; // Required - must be saved first
  flow_definition: {
    nodes: Array<{ id: string; type: string; data: any; position?: any }>;
    edges: Array<{ id?: string; source: string; target: string; sourceHandle?: string }>;
  };
  recipient_email: string;
  recipient_name?: string;
  speed_multiplier?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Client for user auth only
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } }
    });

    // Admin client for all operations (bypasses RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Validate auth
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('[test-playbook] Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: TestPlaybookRequest = await req.json();
    const { 
      playbook_id, 
      flow_definition, 
      recipient_email, 
      recipient_name,
      speed_multiplier = 10 
    } = body;

    console.log(`[test-playbook] Starting test for ${recipient_email} by user ${user.id}`);

    // 2. Validate playbook_id is provided (must be saved first)
    if (!playbook_id) {
      return new Response(
        JSON.stringify({ error: 'playbook_id é obrigatório. Salve o playbook antes de testar.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate flow_definition
    if (!flow_definition || !flow_definition.nodes || flow_definition.nodes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'flow_definition com nodes é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Validate recipient_email
    if (!recipient_email) {
      return new Response(
        JSON.stringify({ error: 'recipient_email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedRecipientEmail = recipient_email.toLowerCase().trim();
    const userEmail = user.email?.toLowerCase().trim();

    // 5. Check user role for permission
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[test-playbook] Failed to fetch profile:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar permissões' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const isManager = MANAGER_ROLES.includes(profile?.role || '');

    // 6. Permission check: non-managers can only send to their own email
    // ENV FLAG: PLAYBOOK_TEST_ALLOW_ANY_RECIPIENT=true allows any user to send to any email
    const allowAnyRecipient = Deno.env.get('PLAYBOOK_TEST_ALLOW_ANY_RECIPIENT') === 'true';
    
    if (!allowAnyRecipient && !isManager && userEmail !== normalizedRecipientEmail) {
      console.log(`[test-playbook] Permission denied: ${userEmail} tried to send to ${normalizedRecipientEmail}`);
      return new Response(
        JSON.stringify({ 
          error: 'Permissão negada: você só pode enviar testes para seu próprio email. Gerentes podem enviar para qualquer destinatário.' 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Rate limit check - 5/hour and 20/day per user
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { count: hourlyCount, error: hourlyError } = await supabaseAdmin
      .from('playbook_test_runs')
      .select('*', { count: 'exact', head: true })
      .eq('started_by', user.id)
      .gte('created_at', oneHourAgo);

    if (hourlyError) {
      console.error('[test-playbook] Rate limit check failed:', hourlyError);
    } else if ((hourlyCount || 0) >= 5) {
      console.log(`[test-playbook] Rate limit exceeded: ${hourlyCount} tests in last hour`);
      return new Response(
        JSON.stringify({ error: 'Rate limit: máximo 5 testes por hora. Aguarde alguns minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { count: dailyCount, error: dailyError } = await supabaseAdmin
      .from('playbook_test_runs')
      .select('*', { count: 'exact', head: true })
      .eq('started_by', user.id)
      .gte('created_at', oneDayAgo);

    if (dailyError) {
      console.error('[test-playbook] Daily rate limit check failed:', dailyError);
    } else if ((dailyCount || 0) >= 20) {
      console.log(`[test-playbook] Daily rate limit exceeded: ${dailyCount} tests in last 24h`);
      return new Response(
        JSON.stringify({ error: 'Rate limit: máximo 20 testes por dia. Tente novamente amanhã.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Validate playbook exists
    const { data: playbook, error: playbookError } = await supabaseAdmin
      .from('onboarding_playbooks')
      .select('id, name')
      .eq('id', playbook_id)
      .single();

    if (playbookError || !playbook) {
      console.error(`[test-playbook] Playbook not found: ${playbook_id}`);
      return new Response(
        JSON.stringify({ error: 'Playbook não encontrado. Salve antes de testar.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Find or create test contact with recipient's email
    let testContact: any;
    
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('email', normalizedRecipientEmail)
      .maybeSingle();

    if (existingContact) {
      testContact = existingContact;
      console.log(`[test-playbook] Reusing existing contact: ${testContact.id}`);
    } else {
      // Create new contact for testing
      const firstName = recipient_name || normalizedRecipientEmail.split('@')[0];
      const { data: newContact, error: contactError } = await supabaseAdmin
        .from('contacts')
        .insert({
          first_name: firstName,
          last_name: '(Teste)',
          email: normalizedRecipientEmail,
          source: 'playbook_test',
          status: 'lead',
        })
        .select()
        .single();

      if (contactError) {
        console.error('[test-playbook] Failed to create contact:', contactError);
        throw new Error(`Erro ao criar contato de teste: ${contactError.message}`);
      }
      testContact = newContact;
      console.log(`[test-playbook] Created new test contact: ${testContact.id}`);
    }

    // 10. Create playbook execution with test mode metadata
    const { data: execution, error: execError } = await supabaseAdmin
      .from('playbook_executions')
      .insert({
        playbook_id: playbook_id,
        contact_id: testContact.id,
        status: 'running',
        current_node_id: flow_definition.nodes[0]?.id,
        nodes_executed: [],
        errors: [],
        metadata: {
          is_test_mode: true,
          speed_multiplier: speed_multiplier,
          test_recipient_email: normalizedRecipientEmail,
          test_recipient_name: recipient_name || null,
          test_run_started_by: user.id,
          started_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (execError) {
      console.error('[test-playbook] Failed to create execution:', execError);
      throw new Error(`Erro ao criar execução: ${execError.message}`);
    }

    console.log(`[test-playbook] Created execution: ${execution.id}`);

    // 11. Calculate total_nodes for progress tracking
    const totalNodes = flow_definition.nodes.length;
    
    // 12. Register in playbook_test_runs for audit with progress tracking
    const { data: testRun, error: testRunError } = await supabaseAdmin
      .from('playbook_test_runs')
      .insert({
        playbook_id: playbook_id,
        execution_id: execution.id,
        started_by: user.id,
        tester_email: normalizedRecipientEmail, // DB column name
        tester_name: recipient_name || null,
        speed_multiplier: speed_multiplier,
        status: 'running',
        flow_snapshot: flow_definition,
        // Progress tracking fields
        total_nodes: totalNodes,
        executed_nodes: 0,
        current_node_id: flow_definition.nodes[0]?.id || null,
        last_event_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (testRunError) {
      console.error('[test-playbook] Failed to create test run record:', testRunError);
      // Non-fatal, continue - but log it
    } else {
      // Update execution metadata with test_run_id for easier debugging
      await supabaseAdmin
        .from('playbook_executions')
        .update({
          metadata: {
            ...execution.metadata,
            test_run_id: testRun.id,
          },
        })
        .eq('id', execution.id);
      
      console.log(`[test-playbook] Created test run: ${testRun.id}`);
    }

    // 13. Queue first node with test mode flags
    const firstNode = flow_definition.nodes[0];
    const { error: queueError } = await supabaseAdmin
      .from('playbook_execution_queue')
      .insert({
        execution_id: execution.id,
        node_id: firstNode.id,
        node_type: firstNode.type,
        node_data: {
          ...firstNode.data,
          _test_mode: true,
          _speed_multiplier: speed_multiplier,
        },
        scheduled_for: new Date().toISOString(),
        status: 'pending',
        retry_count: 0,
        max_retries: 3,
      });

    if (queueError) {
      console.error('[test-playbook] Failed to queue first node:', queueError);
      throw new Error(`Erro ao enfileirar primeiro nó: ${queueError.message}`);
    }

    console.log(`[test-playbook] Queued first node: ${firstNode.id} (type: ${firstNode.type})`);

    // 14. Trigger queue processing immediately
    try {
      await supabaseAdmin.functions.invoke('process-playbook-queue', {
        body: { manual_trigger: true },
      });
      console.log('[test-playbook] Triggered queue processing');
    } catch (triggerError) {
      console.warn('[test-playbook] Failed to trigger immediate processing:', triggerError);
      // Non-fatal, cron will pick it up
    }

    return new Response(
      JSON.stringify({
        success: true,
        execution_id: execution.id,
        test_run_id: testRun?.id || null,
        test_contact_id: testContact.id,
        speed_multiplier: speed_multiplier,
        message: `🧪 Teste iniciado! Emails serão enviados para ${normalizedRecipientEmail}. Delays acelerados ${speed_multiplier}x.`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[test-playbook] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
