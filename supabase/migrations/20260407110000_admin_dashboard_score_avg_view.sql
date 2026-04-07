-- Aggregate view for admin dashboard score card.
-- Avoids loading all submitted exam_attempts into application memory.
create or replace view public.admin_dashboard_score_avg as
select coalesce(round(avg(score))::int, 0) as average_score
from public.exam_attempts
where status = 'submitted';
