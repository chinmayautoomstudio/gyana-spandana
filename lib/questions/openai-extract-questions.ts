import type { ImportRow } from './import-schema'

const SYSTEM = `You extract multiple-choice quiz questions from raw document text. Return JSON only with shape:
{"questions":[{"question_text":"string","option_a":"string","option_b":"string","option_c":"string","option_d":"string","correct_answer":"A"|"B"|"C"|"D","points":number,"category":string|null,"difficulty_level":"easy"|"medium"|"hard","explanation":string|null,"tags":string[]|null}]}
Use null for unknown optional fields. If you cannot find four options, use empty string for missing options. correct_answer must be A,B,C, or D only.`

export async function extractQuestionsWithOpenAI(text: string): Promise<Partial<ImportRow>[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return []

  const truncated = text.length > 120_000 ? text.slice(0, 120_000) + '\n...[truncated]' : text

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMPORT_MODEL || 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `Extract all MCQ questions from this text:\n\n${truncated}`,
        },
      ],
      temperature: 0.1,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI error: ${res.status} ${err}`)
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[]
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) return []

  let parsed: { questions?: Partial<ImportRow>[] }
  try {
    parsed = JSON.parse(content)
  } catch {
    return []
  }

  return Array.isArray(parsed.questions) ? parsed.questions : []
}
