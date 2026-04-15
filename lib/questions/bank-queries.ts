import type { SupabaseClient } from '@supabase/supabase-js'

/** Columns for question bank list + exam join (no select('*')) */
export const QUESTION_BANK_SELECT = `
  id,
  exam_id,
  question_text,
  option_a,
  option_b,
  option_c,
  option_d,
  correct_answer,
  points,
  explanation,
  question_text_odia,
  option_a_odia,
  option_b_odia,
  option_c_odia,
  option_d_odia,
  explanation_odia,
  source_key,
  source_row_index,
  order_index,
  category,
  difficulty_level,
  tags,
  created_at,
  exam:exams(id, title)
`.replace(/\s+/g, ' ')

export const QUESTION_STATS_SELECT = `
  id,
  category,
  difficulty_level,
  exam_id,
  exam:exams(title)
`.replace(/\s+/g, ' ')

export type QuestionBankFilterState = {
  bypassFilters: boolean
  searchTerm: string
  selectedExam: string
  selectedDifficulty: string
  selectedCategory: string
  minPoints: number
  maxPoints: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Postgrest builder chain loses precise types with dynamic filters
function applyQuestionBankFilters(qb: any, f: QuestionBankFilterState): any {
  if (f.bypassFilters) return qb
  let q = qb

  // Server-side: primary text match (options/tags still visible after load)
  if (f.searchTerm.trim()) {
    q = q.ilike('question_text', `%${f.searchTerm.trim()}%`)
  }
  if (f.selectedExam) q = q.eq('exam_id', f.selectedExam)
  if (f.selectedDifficulty) q = q.eq('difficulty_level', f.selectedDifficulty)
  if (f.selectedCategory) q = q.eq('category', f.selectedCategory)
  q = q.gte('points', f.minPoints).lte('points', f.maxPoints)

  return q
}

export async function fetchQuestionBankPage(
  supabase: SupabaseClient,
  page: number,
  pageSize: number,
  sortBy: 'created_at' | 'points' | 'difficulty',
  sortDir: 'asc' | 'desc',
  filters: QuestionBankFilterState
) {
  const orderCol =
    sortBy === 'difficulty' ? 'difficulty_level' : sortBy === 'points' ? 'points' : 'created_at'
  const ascending = sortDir === 'asc'
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let qb = supabase.from('questions').select(QUESTION_BANK_SELECT, { count: 'exact' })
  qb = applyQuestionBankFilters(qb, filters)
  const { data, error, count } = await qb.order(orderCol, { ascending }).range(from, to)

  return { data, error, count: count ?? 0 }
}

export async function fetchQuestionBankStats(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('questions').select(QUESTION_STATS_SELECT)
  return { rows: data ?? [], error }
}

export async function fetchBankDedupeMap(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('questions')
    .select('id, question_text, exam_id')
    .is('exam_id', null)
    .limit(5000)
  return data ?? []
}
