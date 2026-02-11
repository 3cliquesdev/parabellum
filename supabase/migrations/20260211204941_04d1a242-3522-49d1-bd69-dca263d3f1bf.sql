
-- RPC: KPIs consolidados do dashboard de playbooks
CREATE OR REPLACE FUNCTION public.get_playbook_kpis()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT jsonb_build_object(
    'totalExecutions', (SELECT COUNT(*) FROM playbook_executions),
    'running', (SELECT COUNT(*) FROM playbook_executions WHERE status = 'running'),
    'completed', (SELECT COUNT(*) FROM playbook_executions WHERE status LIKE '%completed%'),
    'failed', (SELECT COUNT(*) FROM playbook_executions WHERE status = 'failed'),
    'emails', jsonb_build_object(
      'sent', (SELECT COUNT(*) FROM email_sends),
      'delivered', (SELECT COUNT(*) FROM email_sends WHERE bounced_at IS NULL),
      'opened', (SELECT COUNT(*) FROM email_sends WHERE opened_at IS NOT NULL),
      'clicked', (SELECT COUNT(*) FROM email_sends WHERE clicked_at IS NOT NULL),
      'bounced', (SELECT COUNT(*) FROM email_sends WHERE bounced_at IS NOT NULL)
    )
  )
$$;

-- RPC: Evolucao de emails por dia
CREATE OR REPLACE FUNCTION public.get_email_evolution(p_days int DEFAULT 7)
RETURNS TABLE(day date, sent bigint, delivered bigint, opened bigint, clicked bigint)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    date_trunc('day', sent_at)::date as day,
    COUNT(*) as sent,
    COUNT(CASE WHEN bounced_at IS NULL THEN 1 END) as delivered,
    COUNT(opened_at) as opened,
    COUNT(clicked_at) as clicked
  FROM email_sends
  WHERE sent_at >= CURRENT_DATE - p_days
  GROUP BY day
  ORDER BY day
$$;

-- RPC: Performance por playbook
CREATE OR REPLACE FUNCTION public.get_playbook_performance()
RETURNS TABLE(
  playbook_id uuid, playbook_name text,
  executions bigint, completed bigint, failed bigint,
  emails_sent bigint, emails_opened bigint, open_rate numeric
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT 
    pe.playbook_id,
    COALESCE(op.name, 'Desconhecido') as playbook_name,
    COUNT(DISTINCT pe.id) as executions,
    COUNT(DISTINCT CASE WHEN pe.status LIKE '%completed%' THEN pe.id END) as completed,
    COUNT(DISTINCT CASE WHEN pe.status = 'failed' THEN pe.id END) as failed,
    COUNT(es.id) as emails_sent,
    COUNT(es.opened_at) as emails_opened,
    CASE WHEN COUNT(es.id) > 0 
      THEN ROUND((COUNT(es.opened_at)::numeric / COUNT(es.id)) * 100, 1) 
      ELSE 0 END as open_rate
  FROM playbook_executions pe
  LEFT JOIN onboarding_playbooks op ON op.id = pe.playbook_id
  LEFT JOIN email_sends es ON es.playbook_execution_id = pe.id
  GROUP BY pe.playbook_id, op.name
  ORDER BY executions DESC
$$;
