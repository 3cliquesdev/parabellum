
-- Sprint 2: Hardening - SET search_path = public on SECURITY DEFINER functions

ALTER FUNCTION public.calculate_lead_score(uuid) SET search_path = public;
ALTER FUNCTION public.check_submission_limit(uuid, text) SET search_path = public;
ALTER FUNCTION public.cleanup_expired_insights_cache() SET search_path = public;
ALTER FUNCTION public.get_avg_first_response_time(timestamptz, timestamptz) SET search_path = public;
ALTER FUNCTION public.get_avg_resolution_time(timestamptz, timestamptz) SET search_path = public;

ALTER FUNCTION public.get_commercial_conversations_drilldown(
  timestamptz, timestamptz, uuid, text, uuid, text, text, integer, integer
) SET search_path = public;

ALTER FUNCTION public.get_commercial_conversations_drilldown(
  timestamptz, timestamptz, uuid, uuid, text, text, uuid, boolean, text, integer, integer
) SET search_path = public;

ALTER FUNCTION public.get_commercial_conversations_kpis(
  timestamptz, timestamptz, uuid, uuid, text, text
) SET search_path = public;

ALTER FUNCTION public.get_commercial_conversations_pivot(
  timestamptz, timestamptz, uuid, uuid, text, text
) SET search_path = public;

ALTER FUNCTION public.get_commercial_conversations_report(
  timestamptz, timestamptz, uuid, uuid, text, text, text, integer, integer
) SET search_path = public;

ALTER FUNCTION public.get_consultant_contact_ids(uuid) SET search_path = public;
ALTER FUNCTION public.get_copilot_health_score(timestamptz, timestamptz, uuid) SET search_path = public;
ALTER FUNCTION public.get_support_dashboard_counts(timestamptz, timestamptz) SET search_path = public;
ALTER FUNCTION public.redistribute_on_agent_offline() SET search_path = public;
ALTER FUNCTION public.sync_consultant_to_open_conversations() SET search_path = public;
ALTER FUNCTION public.trigger_calculate_lead_score() SET search_path = public;
ALTER FUNCTION public.trigger_dispatch_on_insert() SET search_path = public;
ALTER FUNCTION public.trigger_generate_embedding() SET search_path = public;
