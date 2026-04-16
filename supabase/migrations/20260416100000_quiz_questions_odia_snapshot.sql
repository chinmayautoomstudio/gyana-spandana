-- Add Odia snapshot fields for quiz runtime question rendering

ALTER TABLE public.quiz_questions
  ADD COLUMN IF NOT EXISTS question_text_odia TEXT,
  ADD COLUMN IF NOT EXISTS option_a_odia TEXT,
  ADD COLUMN IF NOT EXISTS option_b_odia TEXT,
  ADD COLUMN IF NOT EXISTS option_c_odia TEXT,
  ADD COLUMN IF NOT EXISTS option_d_odia TEXT,
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS explanation_odia TEXT;

-- Backfill Odia/Explanation fields from source questions where available.
UPDATE public.quiz_questions AS qq
SET
  question_text_odia = q.question_text_odia,
  option_a_odia = q.option_a_odia,
  option_b_odia = q.option_b_odia,
  option_c_odia = q.option_c_odia,
  option_d_odia = q.option_d_odia,
  explanation = q.explanation,
  explanation_odia = q.explanation_odia
FROM public.questions AS q
WHERE qq.source_question_id = q.id;
