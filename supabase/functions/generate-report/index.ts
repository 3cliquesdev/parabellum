import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  report_type: string;
  filters: {
    startDate?: string;
    endDate?: string;
    departmentId?: string;
    agentId?: string;
    status?: string;
  };
  format: 'csv' | 'pdf';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { report_type, filters, format }: ReportRequest = await req.json();
    console.log('[generate-report] Starting:', { report_type, filters, format });

    // Validação de inputs
    if (!report_type) {
      throw new Error('report_type é obrigatório');
    }

    if (!format || !['csv', 'pdf'].includes(format)) {
      throw new Error('format deve ser "csv" ou "pdf"');
    }

    let data: any[] = [];
    let fileName = '';

    // Generate report based on type
    switch (report_type) {
      case 'tickets_all':
        data = await generateTicketsReport(supabaseClient, filters);
        fileName = `tickets_${Date.now()}`;
        break;
      
      case 'agent_performance':
        data = await generateAgentPerformanceReport(supabaseClient, filters);
        fileName = `agent_performance_${Date.now()}`;
        break;
      
      case 'csat_survey':
        data = await generateCSATReport(supabaseClient, filters);
        fileName = `csat_survey_${Date.now()}`;
        break;
      
      case 'deals_won_lost':
        data = await generateDealsReport(supabaseClient, filters);
        fileName = `deals_${Date.now()}`;
        break;
      
      case 'commissions':
        data = await generateCommissionsReport(supabaseClient, filters);
        fileName = `commissions_${Date.now()}`;
        break;
      
      case 'lost_reasons':
        data = await generateLostReasonsReport(supabaseClient, filters);
        fileName = `lost_reasons_${Date.now()}`;
        break;
      
      case 'stuck_customers':
        data = await generateStuckCustomersReport(supabaseClient, filters);
        fileName = `stuck_customers_${Date.now()}`;
        break;
      
      case 'completion_times':
        data = await generateCompletionTimesReport(supabaseClient, filters);
        fileName = `completion_times_${Date.now()}`;
        break;
      
      case 'conversation_history':
        data = await generateConversationHistoryReport(supabaseClient, filters);
        fileName = `conversations_${Date.now()}`;
        break;
      
      case 'unanswered_questions':
        data = await generateUnansweredQuestionsReport(supabaseClient, filters);
        fileName = `unanswered_${Date.now()}`;
        break;
      
      default:
        throw new Error(`Unknown report type: ${report_type}`);
    }

    console.log('[generate-report] Data fetched:', data?.length || 0, 'rows');

    // Fallback para dados vazios
    if (!data || data.length === 0) {
      console.warn('[generate-report] No data found for filters:', filters);
      data = [];
    }

    if (format === 'csv') {
      const csv = convertToCSV(data);
      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${fileName}.csv"`,
        },
      });
    } else {
      // For PDF, return JSON for now (can be enhanced with PDF generation library)
      return new Response(JSON.stringify({ data, fileName }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });
    }

  } catch (error: any) {
    console.error('[generate-report] ERROR:', error);
    console.error('[generate-report] Stack:', error.stack);
    
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao gerar relatório';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.stack,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Report generation functions
async function generateTicketsReport(supabase: any, filters: any) {
  const { startDate, endDate, departmentId, agentId } = filters;
  
  let query = supabase
    .from('tickets')
    .select(`
      id, subject, status, priority, category,
      created_at, first_response_at, resolved_at,
      contacts:customer_id (first_name, last_name, email),
      profiles:assigned_to (full_name),
      departments:department_id (name)
    `);

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (departmentId) query = query.eq('department_id', departmentId);
  if (agentId) query = query.eq('assigned_to', agentId);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((t: any) => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    category: t.category,
    customer_name: `${t.contacts?.first_name || ''} ${t.contacts?.last_name || ''}`.trim(),
    customer_email: t.contacts?.email || '',
    agent_name: t.profiles?.full_name || 'Não atribuído',
    department: t.departments?.name || 'N/A',
    created_at: t.created_at,
    first_response_at: t.first_response_at,
    resolved_at: t.resolved_at,
  }));
}

async function generateAgentPerformanceReport(supabase: any, filters: any) {
  const { startDate, endDate } = filters;
  
  let query = supabase
    .from('tickets')
    .select(`
      assigned_to,
      status,
      first_response_at,
      resolved_at,
      created_at,
      profiles:assigned_to (full_name)
    `);

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by agent
  const agentStats: any = {};
  data.forEach((t: any) => {
    const agentId = t.assigned_to || 'unassigned';
    if (!agentStats[agentId]) {
      agentStats[agentId] = {
        agent: t.profiles?.full_name || 'Não atribuído',
        total_tickets: 0,
        resolved: 0,
        frt_times: [],
        resolution_times: [],
      };
    }
    
    agentStats[agentId].total_tickets++;
    if (t.status === 'resolved') agentStats[agentId].resolved++;
    
    if (t.first_response_at && t.created_at) {
      const frt = (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60);
      agentStats[agentId].frt_times.push(frt);
    }
    
    if (t.resolved_at && t.created_at) {
      const rt = (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 60);
      agentStats[agentId].resolution_times.push(rt);
    }
  });

  return Object.values(agentStats).map((stats: any) => ({
    agent: stats.agent,
    total_tickets: stats.total_tickets,
    resolved: stats.resolved,
    avg_frt_minutes: stats.frt_times.length > 0 
      ? Math.round(stats.frt_times.reduce((a: number, b: number) => a + b, 0) / stats.frt_times.length)
      : 0,
    avg_resolution_minutes: stats.resolution_times.length > 0
      ? Math.round(stats.resolution_times.reduce((a: number, b: number) => a + b, 0) / stats.resolution_times.length)
      : 0,
  }));
}

async function generateCSATReport(supabase: any, filters: any) {
  const { startDate, endDate } = filters;
  
  let query = supabase
    .from('conversation_ratings')
    .select(`
      rating, feedback_text, channel, created_at,
      conversations:conversation_id (
        contacts:contact_id (first_name, last_name),
        profiles:assigned_to (full_name)
      )
    `);

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((r: any) => ({
    rating: r.rating,
    feedback: r.feedback_text || '',
    channel: r.channel,
    created_at: r.created_at,
    customer: `${r.conversations?.contacts?.first_name || ''} ${r.conversations?.contacts?.last_name || ''}`.trim(),
    agent: r.conversations?.profiles?.full_name || 'N/A',
  }));
}

async function generateDealsReport(supabase: any, filters: any) {
  const { startDate, endDate, status } = filters;
  
  let query = supabase
    .from('deals')
    .select(`
      id, title, value, status, currency, lost_reason,
      created_at, closed_at,
      contacts:contact_id (first_name, last_name, email),
      profiles:assigned_to (full_name),
      stages:stage_id (name),
      pipelines:pipeline_id (name)
    `);

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (status) query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((d: any) => ({
    id: d.id,
    title: d.title,
    value: d.value,
    currency: d.currency,
    status: d.status,
    lost_reason: d.lost_reason || '',
    customer: `${d.contacts?.first_name || ''} ${d.contacts?.last_name || ''}`.trim(),
    customer_email: d.contacts?.email || '',
    sales_rep: d.profiles?.full_name || 'Não atribuído',
    stage: d.stages?.name || '',
    pipeline: d.pipelines?.name || '',
    created_at: d.created_at,
    closed_at: d.closed_at,
  }));
}

async function generateCommissionsReport(supabase: any, filters: any) {
  const { startDate, endDate } = filters;
  
  let query = supabase
    .from('deals')
    .select(`
      id, title, value, currency, closed_at,
      contacts:contact_id (first_name, last_name),
      profiles:assigned_to (full_name),
      products:product_id (name, price)
    `)
    .eq('status', 'won');

  if (startDate) query = query.gte('closed_at', startDate);
  if (endDate) query = query.lte('closed_at', endDate);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((d: any) => ({
    deal_id: d.id,
    deal_title: d.title,
    deal_value: d.value,
    currency: d.currency,
    commission_10_percent: d.value * 0.1,
    sales_rep: d.profiles?.full_name || 'Não atribuído',
    customer: `${d.contacts?.first_name || ''} ${d.contacts?.last_name || ''}`.trim(),
    product: d.products?.name || '',
    closed_at: d.closed_at,
  }));
}

async function generateLostReasonsReport(supabase: any, filters: any) {
  const { startDate, endDate } = filters;
  
  let query = supabase
    .from('deals')
    .select('lost_reason, value')
    .eq('status', 'lost');

  if (startDate) query = query.gte('closed_at', startDate);
  if (endDate) query = query.lte('closed_at', endDate);

  const { data, error } = await query;
  if (error) throw error;

  // Aggregate by lost_reason
  const reasonStats: any = {};
  data.forEach((d: any) => {
    const reason = d.lost_reason || 'Não especificado';
    if (!reasonStats[reason]) {
      reasonStats[reason] = { count: 0, total_value: 0 };
    }
    reasonStats[reason].count++;
    reasonStats[reason].total_value += d.value || 0;
  });

  return Object.entries(reasonStats).map(([reason, stats]: [string, any]) => ({
    lost_reason: reason,
    count: stats.count,
    total_value_lost: stats.total_value,
  }));
}

async function generateStuckCustomersReport(supabase: any, filters: any) {
  const { data, error } = await supabase
    .from('customer_journey_steps')
    .select(`
      id, step_name, is_critical, created_at,
      contacts:contact_id (first_name, last_name, email, status)
    `)
    .eq('completed', false)
    .eq('is_critical', true);

  if (error) throw error;

  return data.map((s: any) => ({
    customer: `${s.contacts?.first_name || ''} ${s.contacts?.last_name || ''}`.trim(),
    email: s.contacts?.email || '',
    status: s.contacts?.status || '',
    step_name: s.step_name,
    stuck_since: s.created_at,
    days_stuck: Math.floor((Date.now() - new Date(s.created_at).getTime()) / (1000 * 60 * 60 * 24)),
  }));
}

async function generateCompletionTimesReport(supabase: any, filters: any) {
  const { startDate, endDate } = filters;
  
  let query = supabase
    .from('playbook_executions')
    .select(`
      id, started_at, completed_at, status,
      contacts:contact_id (first_name, last_name),
      onboarding_playbooks:playbook_id (name)
    `)
    .eq('status', 'completed');

  if (startDate) query = query.gte('started_at', startDate);
  if (endDate) query = query.lte('started_at', endDate);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((e: any) => ({
    customer: `${e.contacts?.first_name || ''} ${e.contacts?.last_name || ''}`.trim(),
    playbook: e.onboarding_playbooks?.name || '',
    started_at: e.started_at,
    completed_at: e.completed_at,
    days_to_complete: e.completed_at && e.started_at
      ? Math.floor((new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0,
  }));
}

async function generateConversationHistoryReport(supabase: any, filters: any) {
  const { startDate, endDate, departmentId } = filters;
  
  let query = supabase
    .from('conversations')
    .select(`
      id, channel, status, created_at, closed_at,
      contacts:contact_id (first_name, last_name, email),
      profiles:assigned_to (full_name),
      departments:department (name)
    `);

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (departmentId) query = query.eq('department', departmentId);

  const { data, error } = await query;
  if (error) throw error;

  return data.map((c: any) => ({
    id: c.id,
    channel: c.channel,
    status: c.status,
    customer: `${c.contacts?.first_name || ''} ${c.contacts?.last_name || ''}`.trim(),
    email: c.contacts?.email || '',
    agent: c.profiles?.full_name || 'Não atribuído',
    department: c.departments?.name || 'N/A',
    created_at: c.created_at,
    closed_at: c.closed_at,
  }));
}

async function generateUnansweredQuestionsReport(supabase: any, filters: any) {
  const { startDate, endDate } = filters;
  
  let query = supabase
    .from('ai_usage_logs')
    .select(`
      id, created_at, result_data,
      conversations:conversation_id (
        contacts:contact_id (first_name, last_name)
      )
    `)
    .eq('feature_type', 'autopilot');

  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error } = await query;
  if (error) throw error;

  // Filter for handoff events (where AI couldn't answer)
  const handoffs = data.filter((log: any) => 
    log.result_data?.handoff === true || log.result_data?.escalated === true
  );

  return handoffs.map((log: any) => ({
    customer: `${log.conversations?.contacts?.first_name || ''} ${log.conversations?.contacts?.last_name || ''}`.trim(),
    escalated_at: log.created_at,
    reason: log.result_data?.reason || 'Sem resposta na base de conhecimento',
  }));
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];

  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      const escaped = ('' + value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  return csvRows.join('\n');
}
