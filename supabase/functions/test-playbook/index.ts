import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestPlaybookRequest {
  playbook_id?: string;
  flow_definition: {
    nodes: Array<{ id: string; type: string; data: any; position?: any }>;
    edges: Array<{ id?: string; source: string; target: string; sourceHandle?: string }>;
  };
  tester_email: string;
  tester_name?: string;
  speed_multiplier?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate auth
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
      tester_email, 
      tester_name,
      speed_multiplier = 10 
    } = body;

    console.log(`[test-playbook] Starting test for ${tester_email} by user ${user.id}`);

    // Validate flow_definition
    if (!flow_definition || !flow_definition.nodes || flow_definition.nodes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'flow_definition com nodes é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tester_email) {
      return new Response(
        JSON.stringify({ error: 'tester_email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Find or create test contact with tester's email
    let testContact: any;
    
    const { data: existingContact } = await supabaseAdmin
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('email', tester_email.toLowerCase())
      .maybeSingle();

    if (existingContact) {
      testContact = existingContact;
      console.log(`[test-playbook] Reusing existing contact: ${testContact.id}`);
    } else {
      // Create new contact for testing
      const firstName = tester_name || tester_email.split('@')[0];
      const { data: newContact, error: contactError } = await supabaseAdmin
        .from('contacts')
        .insert({
          first_name: firstName,
          last_name: '(Teste)',
          email: tester_email.toLowerCase(),
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

    // 2. Determine playbook_id to use (if provided, validate it exists)
    let validPlaybookId = playbook_id || null;
    if (playbook_id) {
      const { data: playbook } = await supabaseAdmin
        .from('onboarding_playbooks')
        .select('id')
        .eq('id', playbook_id)
        .maybeSingle();
      
      if (!playbook) {
        console.warn(`[test-playbook] Playbook ${playbook_id} not found, proceeding without`);
        validPlaybookId = null;
      }
    }

    // 3. Create playbook execution with test mode metadata
    const { data: execution, error: execError } = await supabaseAdmin
      .from('playbook_executions')
      .insert({
        playbook_id: validPlaybookId,
        contact_id: testContact.id,
        status: 'running',
        current_node_id: flow_definition.nodes[0]?.id,
        nodes_executed: [],
        errors: [],
        metadata: {
          is_test_mode: true,
          tester_user_id: user.id,
          tester_email: tester_email,
          speed_multiplier: speed_multiplier,
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

    // 4. Register in playbook_test_runs for audit
    const { error: testRunError } = await supabaseAdmin
      .from('playbook_test_runs')
      .insert({
        playbook_id: validPlaybookId,
        execution_id: execution.id,
        started_by: user.id,
        tester_email: tester_email,
        tester_name: tester_name || null,
        speed_multiplier: speed_multiplier,
        status: 'running',
        flow_snapshot: flow_definition,
      });

    if (testRunError) {
      console.error('[test-playbook] Failed to create test run record:', testRunError);
      // Non-fatal, continue
    }

    // 5. Queue first node with test mode flags
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

    // 6. Trigger queue processing immediately
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
        test_contact_id: testContact.id,
        speed_multiplier: speed_multiplier,
        message: `🧪 Teste iniciado! Emails serão enviados para ${tester_email}. Delays acelerados ${speed_multiplier}x.`,
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
