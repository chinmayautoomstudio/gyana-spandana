import type { ImportRow } from './import-schema'
import { normalizeAnswer, normalizeDifficulty, parseTags } from './import-schema'

/**
 * Best-effort MCQ extraction from plain PDF text (works for consistent formatting).
 * Patterns: numbered questions, A)/a) options, Answer:/Key: lines.
 */
export function extractQuestionsFromPdfText(text: string): Partial<ImportRow>[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const blocks = splitIntoQuestionBlocks(normalized)
  const out: Partial<ImportRow>[] = []

  for (const block of blocks) {
    const parsed = parseQuestionBlock(block)
    if (parsed && parsed.question_text && parsed.option_a && parsed.option_b) {
      out.push(parsed)
    }
  }

  return out
}

function splitIntoQuestionBlocks(text: string): string[] {
  const lines = text.split('\n')
  const blocks: string[] = []
  let current: string[] = []
  const startRe =
    /^\s*(?:Q(?:uestion)?\s*)?(\d+)[.)]\s+(.+)$|^\s*(\d+)[.)]\s+(.+)$/

  for (const line of lines) {
    if (startRe.test(line) && current.length > 0) {
      const joined = current.join('\n').trim()
      if (joined.length > 20) blocks.push(joined)
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length) {
    const joined = current.join('\n').trim()
    if (joined.length > 20) blocks.push(joined)
  }

  if (blocks.length <= 1 && text.length > 50) {
    return [text]
  }
  return blocks
}

function parseQuestionBlock(block: string): Partial<ImportRow> | null {
  const optPatterns = [
    /(?:^|\n)\s*A[.)]\s*([^\n]+)/im,
    /(?:^|\n)\s*B[.)]\s*([^\n]+)/im,
    /(?:^|\n)\s*C[.)]\s*([^\n]+)/im,
    /(?:^|\n)\s*D[.)]\s*([^\n]+)/im,
  ]

  let body = block.replace(/^\s*(?:Q(?:uestion)?\s*)?\d+[.)]\s*/im, '').trim()

  const answerLine =
    body.match(/(?:^|\n)\s*(?:Answer|Correct|Key)\s*[:.]?\s*([ABCD])\b/im) ||
    body.match(/(?:^|\n)\s*(?:Answer|Correct|Key)\s*[:.]?\s*([1-4])\b/im)
  let correct: string | undefined
  if (answerLine) {
    const a = answerLine[1].toUpperCase()
    correct = a === '1' ? 'A' : a === '2' ? 'B' : a === '3' ? 'C' : a === '4' ? 'D' : a
    body = body.replace(answerLine[0], '')
  }

  const marksMatch = body.match(/(?:^|\n)\s*(?:Marks?|Points?)\s*[:.]?\s*(\d+)/im)
  let points = 1
  if (marksMatch) {
    points = parseInt(marksMatch[1], 10) || 1
    body = body.replace(marksMatch[0], '')
  }

  const diffMatch = body.match(/(?:^|\n)\s*Difficulty\s*[:.]?\s*(\w+)/im)
  let difficulty: 'easy' | 'medium' | 'hard' = 'medium'
  if (diffMatch) {
    difficulty = normalizeDifficulty(diffMatch[1])
    body = body.replace(diffMatch[0], '')
  }

  const catMatch = body.match(/(?:^|\n)\s*Category\s*[:.]?\s*([^\n]+)/im)
  let category: string | null = null
  if (catMatch) {
    category = catMatch[1].trim()
    body = body.replace(catMatch[0], '')
  }

  const optA = body.match(optPatterns[0])?.[1]?.trim()
  const optB = body.match(optPatterns[1])?.[1]?.trim()
  const optC = body.match(optPatterns[2])?.[1]?.trim()
  const optD = body.match(optPatterns[3])?.[1]?.trim()

  for (const p of optPatterns) {
    body = body.replace(p, '\n')
  }

  const question_text = body
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^(True|False)$/i.test(l))
    .join(' ')
    .trim()

  const tagsMatch = block.match(/(?:^|\n)\s*Tags?\s*[:.]?\s*([^\n]+)/im)
  const tags = tagsMatch ? parseTags(tagsMatch[1]) : null

  const ans = normalizeAnswer(correct || null)
  return {
    question_text,
    option_a: optA,
    option_b: optB,
    option_c: optC || '',
    option_d: optD || '',
    correct_answer: ans || undefined,
    points,
    category,
    difficulty_level: difficulty,
    explanation: null,
    tags: tags || null,
  }
}
