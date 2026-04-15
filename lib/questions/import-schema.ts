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

/** Optional Odia translations (same row as English in DB) */
export const ODIA_IMPORT_FIELDS = [
  'question_text_odia',
  'option_a_odia',
  'option_b_odia',
  'option_c_odia',
  'option_d_odia',
  'explanation_odia',
] as const

export type QuestionImportField = (typeof QUESTION_IMPORT_FIELDS)[number]
export type OdiaImportField = (typeof ODIA_IMPORT_FIELDS)[number]
export type AllImportField = QuestionImportField | OdiaImportField

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
  question_text_odia: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? undefined : String(v).trim() || undefined), z.string().optional()),
  option_a_odia: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? undefined : String(v).trim() || undefined), z.string().optional()),
  option_b_odia: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? undefined : String(v).trim() || undefined), z.string().optional()),
  option_c_odia: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? undefined : String(v).trim() || undefined), z.string().optional()),
  option_d_odia: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? undefined : String(v).trim() || undefined), z.string().optional()),
  explanation_odia: z
    .preprocess((v) => (v === '' || v === null || v === undefined ? undefined : String(v).trim() || undefined), z.string().optional()),
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

/**
 * Parses tags from sheet/HTML exports: JSON arrays like `["a","b"]`, or CSV-style lists.
 */
export function parseTagsFromSheet(raw: string | undefined | null): string[] | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (s === '') return null
  if (s.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(s)
      if (Array.isArray(parsed)) {
        const out = parsed
          .map((x) => (typeof x === 'string' ? x.trim() : String(x).trim()))
          .filter(Boolean)
        return out.length ? out : null
      }
    } catch {
      /* fall through */
    }
  }
  return parseTags(s)
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
