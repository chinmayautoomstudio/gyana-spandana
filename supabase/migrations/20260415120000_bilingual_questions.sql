-- Bilingual English + Odia question text on a single row; Gyana HTML sync idempotency

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS question_text_odia TEXT,
  ADD COLUMN IF NOT EXISTS option_a_odia TEXT,
  ADD COLUMN IF NOT EXISTS option_b_odia TEXT,
  ADD COLUMN IF NOT EXISTS option_c_odia TEXT,
  ADD COLUMN IF NOT EXISTS option_d_odia TEXT,
  ADD COLUMN IF NOT EXISTS explanation_odia TEXT,
  ADD COLUMN IF NOT EXISTS source_key TEXT,
  ADD COLUMN IF NOT EXISTS source_row_index INTEGER,
  ADD COLUMN IF NOT EXISTS gyana_import_done BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.questions.question_text_odia IS 'Odia translation of question stem (optional)';
COMMENT ON COLUMN public.questions.source_key IS 'Import/sync source identifier (e.g. gyana_spardha_html)';
COMMENT ON COLUMN public.questions.source_row_index IS '0-based row index within source for idempotent pair inserts';
COMMENT ON COLUMN public.questions.gyana_import_done IS 'Gyana sheet "is_done" flag from English export';

CREATE UNIQUE INDEX IF NOT EXISTS questions_source_key_row_idx
  ON public.questions (source_key, source_row_index)
  WHERE source_key IS NOT NULL AND source_row_index IS NOT NULL;

-- Idempotent bilingual insert for scripts/sync-gyana-spardha-html-questions.ts
CREATE OR REPLACE FUNCTION public.insert_gyana_question_pair(
  p_source_key text,
  p_source_row_index integer,
  p_english jsonb,
  p_odia jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id uuid;
  v_id uuid;
  v_points int;
  v_difficulty text;
  v_tags jsonb;
  v_ans text;
BEGIN
  IF p_source_key IS NULL OR trim(p_source_key) = '' OR p_source_row_index IS NULL THEN
    RETURN jsonb_build_object('status', 'skipped', 'reason', 'invalid_source');
  END IF;

  SELECT id INTO v_existing_id
  FROM public.questions
  WHERE source_key = p_source_key AND source_row_index = p_source_row_index
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'skipped', 'id', v_existing_id);
  END IF;

  v_points := COALESCE(NULLIF(trim(p_english->>'points'), '')::int, 1);
  IF v_points < 0 THEN v_points := 0; END IF;
  IF v_points > 1000 THEN v_points := 1000; END IF;

  v_difficulty := lower(trim(COALESCE(p_english->>'difficulty_level', 'medium')));
  IF v_difficulty NOT IN ('easy', 'medium', 'hard') THEN
    v_difficulty := 'medium';
  END IF;

  IF jsonb_typeof(p_english->'tags') = 'array' THEN
    v_tags := COALESCE(p_english->'tags', '[]'::jsonb);
  ELSE
    v_tags := '[]'::jsonb;
  END IF;

  v_ans := upper(substr(trim(COALESCE(p_english->>'correct_answer', '')), 1, 1));
  IF v_ans IS NULL OR v_ans = '' OR v_ans NOT IN ('A', 'B', 'C', 'D') THEN
    v_ans := 'A';
  END IF;

  INSERT INTO public.questions (
    exam_id,
    question_text,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_answer,
    points,
    category,
    difficulty_level,
    explanation,
    tags,
    question_text_odia,
    option_a_odia,
    option_b_odia,
    option_c_odia,
    option_d_odia,
    explanation_odia,
    source_key,
    source_row_index,
    gyana_import_done
  ) VALUES (
    NULL,
    COALESCE(p_english->>'question_text', ''),
    COALESCE(p_english->>'option_a', ''),
    COALESCE(p_english->>'option_b', ''),
    COALESCE(p_english->>'option_c', ''),
    COALESCE(p_english->>'option_d', ''),
    v_ans,
    v_points,
    COALESCE(NULLIF(trim(COALESCE(p_english->>'category', '')), ''), 'Uncategorized'),
    v_difficulty,
    NULLIF(trim(COALESCE(p_english->>'explanation', '')), ''),
    v_tags,
    NULLIF(trim(COALESCE(p_odia->>'question_text', '')), ''),
    NULLIF(trim(COALESCE(p_odia->>'option_a', '')), ''),
    NULLIF(trim(COALESCE(p_odia->>'option_b', '')), ''),
    NULLIF(trim(COALESCE(p_odia->>'option_c', '')), ''),
    NULLIF(trim(COALESCE(p_odia->>'option_d', '')), ''),
    NULLIF(trim(COALESCE(p_odia->>'explanation', '')), ''),
    p_source_key,
    p_source_row_index,
    COALESCE((p_english->>'is_done')::boolean, false)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('status', 'inserted', 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.insert_gyana_question_pair(text, integer, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_gyana_question_pair(text, integer, jsonb, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.insert_gyana_question_pair(text, integer, jsonb, jsonb) TO postgres;
