-- 0008_tighten_audit_grant.sql
-- log_audit_event() is only ever called from trigger functions (which run as
-- their own SECURITY DEFINER owner and don't need this grant to do so), never
-- directly from client code. Granting it to `authenticated` let any logged-in
-- user write arbitrary action/entity_type/entity_id/before/after rows into
-- the audit trail — not an impersonation risk (actor_id is hardcoded to
-- auth.uid()), but it lets anyone pollute an accountability log with
-- fabricated entries. Close that off.
revoke execute on function public.log_audit_event(text, text, uuid, jsonb, jsonb) from authenticated;
