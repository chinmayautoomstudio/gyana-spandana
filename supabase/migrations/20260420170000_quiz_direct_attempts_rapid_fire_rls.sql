-- Allow participants to insert and update rapid-fire direct attempts under strict ownership checks.
-- Preserve existing direct/true-false/buzzer protections.

DROP POLICY IF EXISTS "quiz_direct_attempts_participant_insert" ON public.quiz_direct_attempts;
CREATE POLICY "quiz_direct_attempts_participant_insert"
  ON public.quiz_direct_attempts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM quiz_question_events qe
      JOIN quiz_rounds r ON r.id = qe.round_id
      JOIN quiz_live_sessions s ON s.id = r.session_id
      JOIN participants p ON p.user_id = auth.uid()
      WHERE qe.id = quiz_direct_attempts.question_event_id
        AND quiz_direct_attempts.session_id = s.id
        AND quiz_direct_attempts.verdict = 'pending'
        AND (
          (
            r.round_type = 'direct_question'
            AND qe.status = 'revealed'
            AND qe.directed_team = quiz_direct_attempts.team_label
            AND (s.team_slots ->> qe.directed_team)::uuid = p.team_id
          )
          OR
          (
            r.round_type = 'true_or_false'
            AND qe.status = 'options_revealed'
            AND qe.directed_team = quiz_direct_attempts.team_label
            AND (s.team_slots ->> qe.directed_team)::uuid = p.team_id
          )
          OR
          (
            r.round_type = 'buzzer'
            AND qe.status = 'buzzer_open'
            AND (s.team_slots ->> quiz_direct_attempts.team_label)::uuid = p.team_id
            AND EXISTS (
              SELECT 1
              FROM quiz_buzz_events qbe
              WHERE qbe.question_event_id = qe.id
                AND qbe.team_label = quiz_direct_attempts.team_label
            )
            AND NOT EXISTS (
              SELECT 1
              FROM quiz_pass_log qpl
              WHERE qpl.question_event_id = qe.id
                AND qpl.team_label = quiz_direct_attempts.team_label
                AND qpl.passed_or_wrong = true
            )
          )
          OR
          (
            r.round_type = 'rapid_fire'
            AND qe.status IN ('revealed', 'options_revealed', 'buzzer_open')
            AND quiz_direct_attempts.team_label = COALESCE(qe.rapid_fire_team, qe.directed_team)
            AND (s.team_slots ->> quiz_direct_attempts.team_label)::uuid = p.team_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "quiz_direct_attempts_participant_update_own" ON public.quiz_direct_attempts;
CREATE POLICY "quiz_direct_attempts_participant_update_own"
  ON public.quiz_direct_attempts FOR UPDATE
  TO authenticated
  USING (
    verdict = 'pending'
    AND EXISTS (
      SELECT 1
      FROM quiz_question_events qe
      JOIN quiz_rounds r ON r.id = qe.round_id
      JOIN quiz_live_sessions s ON s.id = quiz_direct_attempts.session_id
      JOIN participants p ON p.user_id = auth.uid()
      WHERE qe.id = quiz_direct_attempts.question_event_id
        AND (
          (
            r.round_type IN ('direct_question', 'true_or_false')
            AND qe.directed_team = quiz_direct_attempts.team_label
          )
          OR
          (
            r.round_type = 'rapid_fire'
            AND quiz_direct_attempts.team_label = COALESCE(qe.rapid_fire_team, qe.directed_team)
            AND qe.status IN ('revealed', 'options_revealed', 'buzzer_open')
          )
        )
        AND (s.team_slots ->> quiz_direct_attempts.team_label)::uuid = p.team_id
    )
  )
  WITH CHECK (
    verdict = 'pending'
    AND EXISTS (
      SELECT 1
      FROM quiz_question_events qe
      JOIN quiz_rounds r ON r.id = qe.round_id
      JOIN quiz_live_sessions s ON s.id = quiz_direct_attempts.session_id
      JOIN participants p ON p.user_id = auth.uid()
      WHERE qe.id = quiz_direct_attempts.question_event_id
        AND (
          (
            r.round_type IN ('direct_question', 'true_or_false')
            AND qe.directed_team = quiz_direct_attempts.team_label
          )
          OR
          (
            r.round_type = 'rapid_fire'
            AND quiz_direct_attempts.team_label = COALESCE(qe.rapid_fire_team, qe.directed_team)
            AND qe.status IN ('revealed', 'options_revealed', 'buzzer_open')
          )
        )
        AND (s.team_slots ->> quiz_direct_attempts.team_label)::uuid = p.team_id
    )
  );
