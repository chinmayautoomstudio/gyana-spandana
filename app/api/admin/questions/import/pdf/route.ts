import { NextRequest, NextResponse } from 'next/server'
import { extractQuestionsFromPdfText } from '@/lib/questions/extract-pdf-questions'
import { extractQuestionsWithOpenAI } from '@/lib/questions/openai-extract-questions'

export const runtime = 'nodejs'

const MAX_BYTES = 15 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 15MB)' }, { status: 400 })
    }

    const buf = Buffer.from(await file.arrayBuffer())

    const pdfParseMod = await import('pdf-parse')
    const pdfParse = (pdfParseMod as unknown as { default?: (b: Buffer) => Promise<{ text: string }> }).default ?? (pdfParseMod as unknown as (b: Buffer) => Promise<{ text: string }>)
    const parsed = await pdfParse(buf)
    const text = typeof parsed.text === 'string' ? parsed.text : ''

    const regexQuestions = extractQuestionsFromPdfText(text)
    let questions = regexQuestions
    let usedOpenAI = false

    if (questions.length === 0 && process.env.OPENAI_API_KEY) {
      try {
        questions = await extractQuestionsWithOpenAI(text)
        usedOpenAI = questions.length > 0
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'OpenAI extraction failed'
        return NextResponse.json({ error: msg, questions: [], usedOpenAI: false }, { status: 502 })
      }
    }

    return NextResponse.json({ questions, usedOpenAI })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'PDF parse failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
