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
  'question_type',
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

export const QUESTION_TYPE_VALUES = ['mcq', 'true_false', 'visual_image', 'visual_video'] as const
export type QuestionTypeValue = (typeof QUESTION_TYPE_VALUES)[number]

export function normalizeQuestionType(raw: unknown): QuestionTypeValue {
  if (raw == null || String(raw).trim() === '') return 'mcq'
  const s = String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_')
  if ((QUESTION_TYPE_VALUES as readonly string[]).includes(s)) return s as QuestionTypeValue
  const aliases: Record<string, QuestionTypeValue> = {
    mcq: 'mcq',
    multiple_choice: 'mcq',
    multiplechoice: 'mcq',
    tf: 'true_false',
    truefalse: 'true_false',
    true_or_false: 'true_false',
    boolean: 'true_false',
    t_f: 'true_false',
    image: 'visual_image',
    visual_image: 'visual_image',
    video: 'visual_video',
    visual_video: 'visual_video',
  }
  return aliases[s] ?? 'mcq'
}

/** Parses TRUE/FALSE from spreadsheet cells (answer column for true_false rows). */
export function normalizeTrueFalseAnswer(raw: unknown): 'TRUE' | 'FALSE' | null {
  if (raw == null) return null
  const s = String(raw).trim().toUpperCase()
  if (s === 'TRUE' || s === 'T' || s === '1' || s === 'YES' || s === 'Y') return 'TRUE'
  if (s === 'FALSE' || s === 'F' || s === '0' || s === 'NO' || s === 'N') return 'FALSE'
  return null
}

const odiaOptional = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : String(v).trim() || undefined),
  z.string().optional()
)

const importRowRawSchema = z.object({
  question_text: z.coerce.string(),
  option_a: z.coerce.string().default(''),
  option_b: z.coerce.string().default(''),
  option_c: z.coerce.string().default(''),
  option_d: z.coerce.string().default(''),
  correct_answer: z.coerce.string(),
  points: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? 1 : val),
    z.coerce.number().int().min(0).max(1000)
  ),
  category: z.string().nullable().optional(),
  difficulty_level: z.preprocess(
    (v) => normalizeDifficulty(v as string | undefined | null),
    z.enum(['easy', 'medium', 'hard'])
  ),
  explanation: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? null : String(v)),
    z.string().nullable().optional()
  ),
  tags: z.preprocess((v) => {
    if (v == null || v === '') return null
    if (Array.isArray(v)) return v.length ? v.map((x) => String(x).trim()).filter(Boolean) : null
    return parseTags(String(v))
  }, z.array(z.string()).nullable().optional()),
  question_text_odia: odiaOptional,
  option_a_odia: odiaOptional,
  option_b_odia: odiaOptional,
  option_c_odia: odiaOptional,
  option_d_odia: odiaOptional,
  explanation_odia: odiaOptional,
  question_type: z.preprocess((v) => normalizeQuestionType(v), z.enum(QUESTION_TYPE_VALUES)),
})

/** One row after column mapping, before DB insert */
export const importRowSchema = importRowRawSchema
  .superRefine((data, ctx) => {
    if (!String(data.question_text).trim()) {
      ctx.addIssue({ code: 'custom', message: 'Question text is required', path: ['question_text'] })
    }
    const t = data.question_type
    if (t === 'true_false') {
      if (!normalizeTrueFalseAnswer(data.correct_answer)) {
        ctx.addIssue({
          code: 'custom',
          message: 'True/false questions need TRUE or FALSE in the answer column',
          path: ['correct_answer'],
        })
      }
    } else {
      const opts: [keyof typeof data, string][] = [
        ['option_a', 'Option A'],
        ['option_b', 'Option B'],
        ['option_c', 'Option C'],
        ['option_d', 'Option D'],
      ]
      for (const [key, label] of opts) {
        if (!String(data[key]).trim()) {
          ctx.addIssue({ code: 'custom', message: `${label} is required`, path: [key] })
        }
      }
      if (!normalizeAnswer(data.correct_answer)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Answer must be A, B, C, or D',
          path: ['correct_answer'],
        })
      }
    }
  })
  .transform((data) => {
    const t = data.question_type
    const tagsVal = data.tags ?? null
    if (t === 'true_false') {
      const tf = normalizeTrueFalseAnswer(data.correct_answer)!
      return {
        question_text: String(data.question_text).trim(),
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'A' as const,
        correct_answer_tf: tf,
        points: data.points,
        category: data.category ?? null,
        difficulty_level: data.difficulty_level,
        explanation: data.explanation ?? null,
        tags: tagsVal,
        question_text_odia: data.question_text_odia,
        option_a_odia: undefined,
        option_b_odia: undefined,
        option_c_odia: undefined,
        option_d_odia: undefined,
        explanation_odia: data.explanation_odia,
        question_type: t,
      }
    }
    const ans = normalizeAnswer(data.correct_answer)!
    return {
      question_text: String(data.question_text).trim(),
      option_a: String(data.option_a).trim(),
      option_b: String(data.option_b).trim(),
      option_c: String(data.option_c).trim(),
      option_d: String(data.option_d).trim(),
      correct_answer: ans,
      correct_answer_tf: null,
      points: data.points,
      category: data.category ?? null,
      difficulty_level: data.difficulty_level,
      explanation: data.explanation ?? null,
      tags: tagsVal,
      question_text_odia: data.question_text_odia,
      option_a_odia: data.option_a_odia,
      option_b_odia: data.option_b_odia,
      option_c_odia: data.option_c_odia,
      option_d_odia: data.option_d_odia,
      explanation_odia: data.explanation_odia,
      question_type: t,
    }
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
