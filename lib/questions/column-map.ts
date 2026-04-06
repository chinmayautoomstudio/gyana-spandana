import type { QuestionImportField } from './import-schema'

/** Map normalized header → canonical field (first match wins) */
const HEADER_ALIASES: Record<string, QuestionImportField> = {
  question: 'question_text',
  'question text': 'question_text',
  question_text: 'question_text',
  stem: 'question_text',
  prompt: 'question_text',

  'option a': 'option_a',
  option_a: 'option_a',
  a: 'option_a',
  'choice a': 'option_a',

  'option b': 'option_b',
  option_b: 'option_b',
  b: 'option_b',
  'choice b': 'option_b',

  'option c': 'option_c',
  option_c: 'option_c',
  c: 'option_c',
  'choice c': 'option_c',

  'option d': 'option_d',
  option_d: 'option_d',
  d: 'option_d',
  'choice d': 'option_d',

  answer: 'correct_answer',
  'correct answer': 'correct_answer',
  correct_answer: 'correct_answer',
  key: 'correct_answer',
  'right answer': 'correct_answer',

  points: 'points',
  marks: 'points',
  score: 'points',
  point: 'points',

  category: 'category',
  topic: 'category',
  subject: 'category',

  difficulty: 'difficulty_level',
  difficulty_level: 'difficulty_level',
  level: 'difficulty_level',

  explanation: 'explanation',
  explain: 'explanation',
  rationale: 'explanation',

  tags: 'tags',
  tag: 'tags',
  keywords: 'tags',
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
}

/**
 * Given CSV/XLSX header row, suggest mapping header index → field.
 * Unmapped columns are omitted.
 */
export function suggestColumnMapping(headers: string[]): Record<number, QuestionImportField> {
  const map: Record<number, QuestionImportField> = {}
  headers.forEach((h, index) => {
    const key = normalizeHeader(h)
    const field = HEADER_ALIASES[key]
    if (field) map[index] = field
  })
  return map
}

export function applyColumnMapping(
  row: string[],
  mapping: Record<number, QuestionImportField>
): Partial<Record<QuestionImportField, string>> {
  const out: Partial<Record<QuestionImportField, string>> = {}
  Object.entries(mapping).forEach(([idxStr, field]) => {
    const idx = parseInt(idxStr, 10)
    const cell = row[idx]
    if (cell !== undefined && cell !== null) {
      const s = String(cell).trim()
      if (s !== '') out[field] = s
    }
  })
  return out
}

export function rowObjectToImportPartial(obj: Partial<Record<QuestionImportField, string>>): Record<string, unknown> {
  const {
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
  } = obj

  return {
    question_text: question_text ?? '',
    option_a: option_a ?? '',
    option_b: option_b ?? '',
    option_c: option_c ?? '',
    option_d: option_d ?? '',
    correct_answer: correct_answer,
    points: points !== undefined ? points : 1,
    category: category || null,
    difficulty_level: difficulty_level,
    explanation: explanation || null,
    tags: tags,
  }
}
