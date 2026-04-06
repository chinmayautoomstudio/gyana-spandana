import { z } from 'zod'

export const QUESTION_IMPORT_FIELDS = [
  'question_text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_answer',
  'points',
  'category',
  'difficulty_level',
  'explanation',
  'tags',
] as const

export type QuestionImportField = (typeof QUESTION_IMPORT_FIELDS)[number]

/** One row after column mapping, before DB insert */
export const importRowSchema = z.object({
  question_text: z.string().min(1, 'Question text is required'),
  option_a: z.string().min(1, 'Option A is required'),
  option_b: z.string().min(1, 'Option B is required'),
  option_c: z.string().min(1, 'Option C is required'),
  option_d: z.string().min(1, 'Option D is required'),
  correct_answer: z.enum(['A', 'B', 'C', 'D'], { message: 'Answer must be A, B, C, or D' }),
  points: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 1 : val),
    z.coerce.number().int().min(0).max(1000)
  ),
  category: z.string().nullable().optional(),
  difficulty_level: z.enum(['easy', 'medium', 'hard']).default('medium'),
  explanation: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
})

export type ImportRow = z.infer<typeof importRowSchema>

/** Payload for Supabase insert (question bank: exam_id null) */
export type QuestionBankInsert = ImportRow & {
  exam_id: null
  import_batch_id?: string | null
}

export function normalizeAnswer(raw: string | undefined | null): 'A' | 'B' | 'C' | 'D' | null {
  if (raw == null || String(raw).trim() === '') return null
  const s = String(raw).trim().toUpperCase()
  if (s === 'A' || s === 'B' || s === 'C' || s === 'D') return s
  const m = s.match(/^OPTION\s*([ABCD])$/)
  if (m) return m[1] as 'A' | 'B' | 'C' | 'D'
  const m2 = s.match(/^([ABCD])\)/)
  if (m2) return m2[1] as 'A' | 'B' | 'C' | 'D'
  return null
}

export function normalizeDifficulty(
  raw: string | undefined | null
): 'easy' | 'medium' | 'hard' {
  if (!raw) return 'medium'
  const s = String(raw).trim().toLowerCase()
  if (s === 'easy' || s === 'e') return 'easy'
  if (s === 'hard' || s === 'h' || s === 'difficult') return 'hard'
  if (s === 'medium' || s === 'med' || s === 'm' || s === 'moderate') return 'medium'
  return 'medium'
}

export function parseTags(raw: string | undefined | null): string[] | null {
  if (raw == null || String(raw).trim() === '') return null
  const parts = String(raw)
    .split(/[,;|]/)
    .map((t) => t.trim())
    .filter(Boolean)
  return parts.length ? parts : null
}

export function validateImportRow(row: Partial<ImportRow>): { ok: true; data: ImportRow } | { ok: false; errors: string[] } {
  const parsed = importRowSchema.safeParse(row)
  if (parsed.success) return { ok: true, data: parsed.data }
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => i.message),
  }
}

export function normalizeQuestionTextForDedupe(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase()
}
