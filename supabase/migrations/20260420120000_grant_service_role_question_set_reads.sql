-- Admin API uses service_role (createAdminClient) after JWT ensureAdmin.
-- These tables lacked service_role grants unlike quiz_* tables, causing:
-- "permission denied for table question_set_questions".

GRANT SELECT ON public.question_set_questions TO service_role;
GRANT SELECT ON public.question_sets TO service_role;
GRANT SELECT ON public.questions TO service_role;
