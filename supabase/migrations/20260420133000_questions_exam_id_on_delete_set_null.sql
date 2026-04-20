-- Keep question bank rows when an exam is deleted.
-- This avoids FK conflicts with quiz snapshots that reference source questions.

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_exam_id_fkey;

ALTER TABLE public.questions
  ADD CONSTRAINT questions_exam_id_fkey
  FOREIGN KEY (exam_id)
  REFERENCES public.exams(id)
  ON DELETE SET NULL;
