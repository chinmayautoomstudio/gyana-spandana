SELECT COUNT(*)::int AS total_non_empty_question_text_odia
FROM public.questions
WHERE COALESCE(BTRIM(question_text_odia), '') <> '';