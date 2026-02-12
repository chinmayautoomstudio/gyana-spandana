-- Allow users to delete their own notifications.
-- Apply via Supabase Dashboard: SQL Editor → New query → paste this file → Run.
-- Or with Supabase CLI (after supabase login): npx supabase db push
--
-- To verify: Dashboard → Table Editor → notifications → click "RLS policies" / "Policies".
-- You should see "Users can delete their own notifications" for DELETE with USING (auth.uid() = user_id).
CREATE POLICY "Users can delete their own notifications"
ON notifications FOR DELETE
USING (auth.uid() = user_id);
