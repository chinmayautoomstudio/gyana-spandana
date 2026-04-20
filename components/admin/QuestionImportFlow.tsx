'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import {
  QUESTION_IMPORT_FIELDS,
  ODIA_IMPORT_FIELDS,
  QUESTION_TYPE_VALUES,
  type AllImportField,
  type ImportRow,
  normalizeAnswer,
  normalizeDifficulty,
  normalizeQuestionType,
  parseTags,
  validateImportRow,
  normalizeQuestionTextForDedupe,
} from '@/lib/questions/import-schema'
import {
  suggestColumnMapping,
  applyColumnMapping,
  rowObjectToImportPartial,
} from '@/lib/questions/column-map'

export type ImportCompleteResult = {
  inserted: number
  skipped: number
  failed: number
}

export type QuestionImportFlowProps = {
  bankTextToId: Map<string, string>
  onComplete: (result: ImportCompleteResult) => void
  /** True when user has chosen a file or moved past upload (for tab-switch guard). */
  onActivityChange?: (active: boolean) => void
  className?: string
}

type FlowStep = 'upload' | 'mapping' | 'preview' | 'confirm'

type PreviewRow = {
  key: string
  draft: Record<string, string>
  validationErrors: string[]
  dupExistingId: string | null
  dupInBatch: boolean
  duplicateAction: 'skip' | 'insert' | 'overwrite'
  selected: boolean
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function draftToImportPartial(d: Record<string, string>): Record<string, unknown> {
  const tagsStr = d.tags ?? ''
  const emptyToUndef = (s: string | undefined) =>
    s === undefined || String(s).trim() === '' ? undefined : String(s).trim()
  const qt = normalizeQuestionType(d.question_type)
  const correctForSchema =
    qt === 'true_false'
      ? String(d.correct_answer ?? '')
      : String(normalizeAnswer(d.correct_answer) ?? '')
  return {
    question_text: d.question_text ?? '',
    option_a: d.option_a ?? '',
    option_b: d.option_b ?? '',
    option_c: d.option_c ?? '',
    option_d: d.option_d ?? '',
    correct_answer: correctForSchema,
    points: d.points === '' || d.points === undefined ? 1 : Number(d.points),
    category: d.category || null,
    difficulty_level: normalizeDifficulty(d.difficulty_level),
    explanation: d.explanation || null,
    tags: typeof tagsStr === 'string' ? parseTags(tagsStr) : null,
    question_type: qt,
    question_text_odia: emptyToUndef(d.question_text_odia),
    option_a_odia: emptyToUndef(d.option_a_odia),
    option_b_odia: emptyToUndef(d.option_b_odia),
    option_c_odia: emptyToUndef(d.option_c_odia),
    option_d_odia: emptyToUndef(d.option_d_odia),
    explanation_odia: emptyToUndef(d.explanation_odia),
  }
}

function buildPreviewRows(
  partials: Partial<ImportRow>[],
  bankTextToId: Map<string, string>
): PreviewRow[] {
  const seen = new Set<string>()
  return partials.map((p) => {
    const d: Record<string, string> = {
      question_text: p.question_text ?? '',
      option_a: p.option_a ?? '',
      option_b: p.option_b ?? '',
      option_c: p.option_c ?? '',
      option_d: p.option_d ?? '',
      correct_answer:
        typeof p.correct_answer === 'string'
          ? p.correct_answer
          : p.correct_answer != null
            ? String(p.correct_answer)
            : '',
      points: String(p.points ?? 1),
      category: p.category ?? '',
      difficulty_level: p.difficulty_level ?? 'medium',
      explanation: p.explanation ?? '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : '',
      question_type: normalizeQuestionType(p.question_type),
      question_text_odia: p.question_text_odia ?? '',
      option_a_odia: p.option_a_odia ?? '',
      option_b_odia: p.option_b_odia ?? '',
      option_c_odia: p.option_c_odia ?? '',
      option_d_odia: p.option_d_odia ?? '',
      explanation_odia: p.explanation_odia ?? '',
    }
    const partial = draftToImportPartial(d)
    const v = validateImportRow(partial as Partial<ImportRow>)
    const norm = normalizeQuestionTextForDedupe(d.question_text)
    const dupExisting = norm.length > 5 ? bankTextToId.get(norm) ?? null : null
    let dupInBatch = false
    if (norm.length > 5) {
      if (seen.has(norm)) dupInBatch = true
      seen.add(norm)
    }
    let duplicateAction: 'skip' | 'insert' | 'overwrite' = 'insert'
    if (dupExisting || dupInBatch) duplicateAction = 'skip'

    return {
      key: crypto.randomUUID(),
      draft: d,
      validationErrors: v.ok ? [] : v.errors,
      dupExistingId: dupExisting,
      dupInBatch,
      duplicateAction,
      selected: v.ok,
    }
  })
}

export function QuestionImportFlow({
  bankTextToId,
  onComplete,
  onActivityChange,
  className = '',
}: QuestionImportFlowProps) {
  const [step, setStep] = useState<FlowStep>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState<'csv' | 'xlsx' | 'pdf' | null>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<string[][]>([])
  const [columnMapping, setColumnMapping] = useState<Record<number, AllImportField>>({})
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([])
  const [extracting, setExtracting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [globalDupPolicy, setGlobalDupPolicy] = useState<'skip' | 'overwrite'>('skip')
  const [pdfUsedAI, setPdfUsedAI] = useState(false)

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setSource(null)
    setHeaders([])
    setRawRows([])
    setColumnMapping({})
    setPreviewRows([])
    setExtracting(false)
    setImporting(false)
    setPdfUsedAI(false)
  }, [])

  const importActive = step !== 'upload' || !!file
  useEffect(() => {
    onActivityChange?.(importActive)
  }, [importActive, onActivityChange])

  const pickFile = useCallback((f: File) => {
    const name = f.name.toLowerCase()
    if (name.endsWith('.csv')) {
      setSource('csv')
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      setSource('xlsx')
    } else if (name.endsWith('.pdf')) {
      setSource('pdf')
    } else {
      toast.error('Use CSV, XLSX, or PDF')
      return
    }
    setFile(f)
    toast.success(`Selected ${f.name}`)
  }, [])

  const downloadXlsxTemplate = useCallback(() => {
    const headers = [...QUESTION_IMPORT_FIELDS, ...ODIA_IMPORT_FIELDS]
    const ws = XLSX.utils.aoa_to_sheet([headers])
    // Set a reasonable column width so headers are readable in Excel
    ws['!cols'] = headers.map(() => ({ wch: 24 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Questions')
    XLSX.writeFile(wb, 'questions-template.xlsx')
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files[0]
      if (f) pickFile(f)
    },
    [pickFile]
  )

  const runExtract = async () => {
    if (!file || !source) return
    setExtracting(true)
    try {
      if (source === 'pdf') {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/questions/import/pdf', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'PDF import failed')
        setPdfUsedAI(!!data.usedOpenAI)
        const partials = (data.questions || []) as Partial<ImportRow>[]
        setPreviewRows(buildPreviewRows(partials, bankTextToId))
        setStep('preview')
        toast.success(
          partials.length
            ? `Extracted ${partials.length} question(s)${data.usedOpenAI ? ' (AI-assisted)' : ''}`
            : 'No questions found in PDF'
        )
        return
      }

      let rows: string[][] = []
      if (source === 'csv') {
        const text = await file.text()
        const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true })
        rows = (parsed.data as string[][]).filter((r) => r.some((c) => String(c).trim() !== ''))
      } else {
        const ab = await file.arrayBuffer()
        const wb = XLSX.read(ab, { type: 'array' })
        const sheet = wb.Sheets[wb.SheetNames[0]]
        rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '' }) as string[][]
        rows = rows.filter((r) => r.some((c) => String(c).trim() !== ''))
      }

      if (rows.length < 2) {
        toast.error('No data rows found')
        return
      }

      const hdrs = rows[0].map((h) => String(h))
      const dataRows = rows.slice(1)
      setHeaders(hdrs)
      setRawRows(dataRows)
      setColumnMapping(suggestColumnMapping(hdrs))
      setStep('mapping')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Extraction failed')
    } finally {
      setExtracting(false)
    }
  }

  const applyMappingAndPreview = () => {
    const partials: Partial<ImportRow>[] = []
    for (const row of rawRows) {
      const obj = applyColumnMapping(row, columnMapping)
      const flat = rowObjectToImportPartial(obj) as Record<string, unknown>
      const qt = normalizeQuestionType(flat.question_type as string | undefined)
      const ans =
        qt === 'true_false'
          ? String(flat.correct_answer ?? '').trim() || undefined
          : normalizeAnswer(flat.correct_answer as string | null) || undefined
      const odEmpty = (k: string) => {
        const v = flat[k]
        if (v === undefined || v === null) return undefined
        const s = String(v).trim()
        return s === '' ? undefined : s
      }
      partials.push({
        question_text: String(flat.question_text || ''),
        option_a: String(flat.option_a || ''),
        option_b: String(flat.option_b || ''),
        option_c: String(flat.option_c || ''),
        option_d: String(flat.option_d || ''),
        correct_answer: ans,
        points: flat.points !== undefined && flat.points !== '' ? Number(flat.points) : 1,
        category: (flat.category as string) || null,
        difficulty_level: normalizeDifficulty(flat.difficulty_level as string),
        explanation: (flat.explanation as string) || null,
        tags: parseTags(flat.tags as string),
        question_type: qt,
        question_text_odia: odEmpty('question_text_odia'),
        option_a_odia: odEmpty('option_a_odia'),
        option_b_odia: odEmpty('option_b_odia'),
        option_c_odia: odEmpty('option_c_odia'),
        option_d_odia: odEmpty('option_d_odia'),
        explanation_odia: odEmpty('explanation_odia'),
      } as unknown as Partial<ImportRow>)
    }
    setPreviewRows(buildPreviewRows(partials, bankTextToId))
    setStep('preview')
    toast.success(`Prepared ${partials.length} row(s) for preview`)
  }

  const updateDraft = (key: string, field: string, value: string) => {
    setPreviewRows((prev) =>
      prev.map((r) => {
        if (r.key !== key) return r
        let draft = { ...r.draft, [field]: value }
        if (field === 'question_type') {
          const prevT = normalizeQuestionType(r.draft.question_type)
          const nextT = normalizeQuestionType(value)
          if (nextT === 'true_false' && /^[ABCD]$/i.test(draft.correct_answer?.trim() ?? '')) {
            draft = { ...draft, correct_answer: 'TRUE' }
          } else if (prevT === 'true_false' && nextT !== 'true_false') {
            const ca = (draft.correct_answer ?? '').trim().toUpperCase()
            if (ca === 'TRUE' || ca === 'FALSE') {
              draft = { ...draft, correct_answer: 'A' }
            }
          }
        }
        const partial = draftToImportPartial(draft)
        const v = validateImportRow(partial as Partial<ImportRow>)
        const norm = normalizeQuestionTextForDedupe(draft.question_text)
        const dupExisting = norm.length > 5 ? bankTextToId.get(norm) ?? null : null
        return {
          ...r,
          draft,
          validationErrors: v.ok ? [] : v.errors,
          dupExistingId: dupExisting,
          selected: v.ok ? r.selected : false,
        }
      })
    )
  }

  const setRowDupAction = (key: string, action: 'skip' | 'insert' | 'overwrite') => {
    setPreviewRows((prev) => prev.map((r) => (r.key === key ? { ...r, duplicateAction: action } : r)))
  }

  const toggleRowSelected = (key: string) => {
    setPreviewRows((prev) =>
      prev.map((r) => (r.key === key ? { ...r, selected: !r.selected } : r))
    )
  }

  const toggleSelectAllValid = () => {
    setPreviewRows((prev) => {
      const validRows = prev.filter((r) => r.validationErrors.length === 0)
      const allSelected = validRows.length > 0 && validRows.every((r) => r.selected)
      return prev.map((r) =>
        r.validationErrors.length === 0 ? { ...r, selected: !allSelected } : { ...r, selected: false }
      )
    })
  }

  const applyGlobalDupPolicy = () => {
    setPreviewRows((prev) =>
      prev.map((r) => {
        if (!r.dupExistingId && !r.dupInBatch) return r
        return {
          ...r,
          duplicateAction: globalDupPolicy === 'skip' ? 'skip' : r.dupExistingId ? 'overwrite' : 'skip',
        }
      })
    )
    toast.message('Applied duplicate policy to flagged rows')
  }

  const validCount = useMemo(
    () => previewRows.filter((r) => r.validationErrors.length === 0).length,
    [previewRows]
  )

  const selectedCount = useMemo(
    () => previewRows.filter((r) => r.selected).length,
    [previewRows]
  )

  const importSummary = useMemo(() => {
    let willImport = 0
    let willSkipDup = 0
    let invalidSelected = 0
    for (const row of previewRows) {
      if (!row.selected) continue
      const partial = draftToImportPartial(row.draft)
      const v = validateImportRow(partial as Partial<ImportRow>)
      if (!v.ok) {
        invalidSelected++
        continue
      }
      const { dupExistingId, duplicateAction, dupInBatch } = row
      if (duplicateAction === 'skip' && (dupExistingId || dupInBatch)) {
        willSkipDup++
        continue
      }
      willImport++
    }
    const notSelected = previewRows.length - selectedCount
    return { willImport, willSkipDup, invalidSelected, notSelected }
  }, [previewRows, selectedCount])

  const runImport = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Not signed in')
      return
    }

    setImporting(true)
    let inserted = 0
    let skipped = 0
    let failed = 0
    const selectedRows = previewRows.filter((r) => r.selected)

    try {
      const { data: batch, error: batchErr } = await supabase
        .from('import_batches')
        .insert({
          filename: file?.name || 'import',
          source: source || 'csv',
          row_count: selectedRows.length,
          inserted_count: 0,
          skipped_count: 0,
          status: 'pending',
          created_by: user.id,
        })
        .select('id')
        .single()

      if (batchErr) {
        console.warn('import_batches insert failed (table missing?)', batchErr)
      }

      const batchId = batch?.id ?? null

      for (const row of previewRows) {
        if (!row.selected) continue

        const partial = draftToImportPartial(row.draft)
        const v = validateImportRow(partial as Partial<ImportRow>)
        if (!v.ok) {
          failed++
          continue
        }

        const { dupExistingId, duplicateAction, dupInBatch } = row
        if (duplicateAction === 'skip' && (dupExistingId || dupInBatch)) {
          skipped++
          continue
        }

        const tagsArray = v.data.tags
        const isTf = v.data.question_type === 'true_false'
        const payload: Record<string, unknown> = {
          exam_id: null,
          question_text: v.data.question_text,
          question_type: v.data.question_type,
          media_url: null,
          option_a: isTf ? null : v.data.option_a,
          option_b: isTf ? null : v.data.option_b,
          option_c: isTf ? null : v.data.option_c,
          option_d: isTf ? null : v.data.option_d,
          correct_answer: v.data.correct_answer,
          correct_answer_tf: v.data.correct_answer_tf,
          points: v.data.points,
          explanation: v.data.explanation,
          category: v.data.category,
          difficulty_level: v.data.difficulty_level,
          tags: tagsArray,
          import_batch_id: batchId,
          question_text_odia: v.data.question_text_odia ?? null,
          option_a_odia: isTf ? null : (v.data.option_a_odia ?? null),
          option_b_odia: isTf ? null : (v.data.option_b_odia ?? null),
          option_c_odia: isTf ? null : (v.data.option_c_odia ?? null),
          option_d_odia: isTf ? null : (v.data.option_d_odia ?? null),
          explanation_odia: v.data.explanation_odia ?? null,
        }

        if (duplicateAction === 'overwrite' && dupExistingId) {
          const { error } = await supabase.from('questions').update(payload).eq('id', dupExistingId)
          if (error) failed++
          else inserted++
        } else {
          const { error } = await supabase.from('questions').insert(payload)
          if (error) failed++
          else inserted++
        }
      }

      if (batchId) {
        await supabase
          .from('import_batches')
          .update({
            inserted_count: inserted,
            skipped_count: skipped,
            status:
              selectedRows.length > 0 && inserted === 0 && failed === selectedRows.length
                ? 'failed'
                : 'completed',
            error_message: failed > 0 ? `${failed} row(s) failed validation or DB` : null,
          })
          .eq('id', batchId)
      }

      onComplete({ inserted, skipped, failed })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  const userStepIndex =
    step === 'upload' ? 0 : step === 'mapping' || step === 'preview' ? 1 : 2

  const userSteps = [
    { label: 'Upload' },
    { label: 'Preview & map' },
    { label: 'Confirm' },
  ]

  return (
    <div className={`flex flex-col min-h-0 flex-1 ${className}`}>
      <div className="px-1 pb-3 border-b border-gray-100 bg-gray-50/80 rounded-t-lg -mx-1">
        <ol className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm" aria-label="Import steps">
          {userSteps.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                  i <= userStepIndex ? 'bg-[#C0392B] text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {i + 1}
              </span>
              <span className={i <= userStepIndex ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                {s.label}
              </span>
              {i < userSteps.length - 1 && <span className="text-gray-300 hidden sm:inline">→</span>}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        {step === 'upload' && (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 text-center hover:border-[#C0392B]/50 transition-colors bg-gray-50/50"
          >
            <p className="text-gray-700 mb-2">Drag and drop a file here, or</p>
            <label className="inline-block">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) pickFile(f)
                }}
              />
              <span className="cursor-pointer px-4 py-2 rounded-lg bg-[#C0392B] text-white text-sm font-medium hover:bg-[#A93226]">
                Choose file
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-3">CSV, XLSX, or PDF — max 15MB (PDF)</p>
            <p className="text-xs text-gray-500 mt-1">
              Need a template?{' '}
              <button
                type="button"
                onClick={downloadXlsxTemplate}
                className="text-[#C0392B] underline hover:text-[#A93226] font-medium"
              >
                Download XLSX Template
              </button>{' '}
              (includes all English &amp; Odia columns)
            </p>
            {file && (
              <p className="mt-4 text-sm text-gray-800">
                <strong>{file.name}</strong>
                <span className="text-gray-500"> · {formatBytes(file.size)}</span>
                <span className="text-gray-500"> · {source}</span>
              </p>
            )}
          </div>
        )}

        {step === 'mapping' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-800">
              Map each column to a question field. First row was used as headers.
            </p>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-gray-700 font-semibold p-2">Column</th>
                    <th className="text-left text-gray-700 font-semibold p-2">Maps to</th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((h, idx) => (
                    <tr key={idx} className="border-t border-gray-100">
                      <td className="p-2 font-mono text-xs text-gray-800 max-w-[200px] truncate" title={h}>
                        {h || `(column ${idx + 1})`}
                      </td>
                      <td className="p-2">
                        <select
                          value={columnMapping[idx] ?? ''}
                          onChange={(e) => {
                            const v = e.target.value as AllImportField | ''
                            setColumnMapping((prev) => {
                              const next = { ...prev }
                              if (!v) delete next[idx]
                              else next[idx] = v
                              return next
                            })
                          }}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-gray-900 bg-white"
                        >
                          <option value="">— Ignore —</option>
                          <optgroup label="English (required fields)">
                            {QUESTION_IMPORT_FIELDS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Odia (optional translations)">
                            {ODIA_IMPORT_FIELDS.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-700">{rawRows.length} data rows</p>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {pdfUsedAI && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2">
                PDF used AI-assisted extraction. Please review all rows before confirming.
              </p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
              <span className="text-sm text-gray-600">
                {validCount} / {previewRows.length} rows pass validation · {selectedCount} selected
              </span>
              <button
                type="button"
                className="text-sm text-[#C0392B] font-medium hover:underline"
                onClick={toggleSelectAllValid}
              >
                Toggle all valid rows
              </button>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Duplicates:</span>
                <select
                  value={globalDupPolicy}
                  onChange={(e) => setGlobalDupPolicy(e.target.value as 'skip' | 'overwrite')}
                  className="border rounded-lg px-2 py-1 text-gray-900 bg-white"
                >
                  <option value="skip">Skip duplicates</option>
                  <option value="overwrite">Overwrite existing (bank)</option>
                </select>
                <Button type="button" variant="outline" size="sm" onClick={applyGlobalDupPolicy}>
                  Apply to flagged rows
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Invalid rows are unchecked by default—fix fields to enable selection, or leave unchecked to skip.
            </p>
            <div className="overflow-x-auto border rounded-lg max-h-[55vh] overflow-y-auto">
              <table className="w-full text-xs min-w-[1920px]">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left text-gray-700 font-semibold p-2 w-10">
                      <span className="sr-only">Include</span>
                    </th>
                    <th className="text-left text-gray-700 font-semibold p-2 sticky left-0 bg-gray-50 z-20">#</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[120px]">Type</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[180px]">Question</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[160px]">Question (Odia)</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[180px]">Options A–D</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[180px]">Options A–D (Odia)</th>
                    <th className="text-left text-gray-700 font-semibold p-2">Ans</th>
                    <th className="text-left text-gray-700 font-semibold p-2">Pts</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[180px]">Explanation</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[180px]">Explanation (Odia)</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[120px]">Difficulty</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[140px]">Category</th>
                    <th className="text-left text-gray-700 font-semibold p-2 min-w-[160px]">Tags</th>
                    <th className="text-left text-gray-700 font-semibold p-2">Dup</th>
                    <th className="text-left text-gray-700 font-semibold p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr
                      key={r.key}
                      className={`border-t border-gray-100 ${
                        r.validationErrors.length ? 'bg-red-50/50' : ''
                      }`}
                    >
                      <td className="p-1 align-top">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          disabled={r.validationErrors.length > 0}
                          onChange={() => toggleRowSelected(r.key)}
                          className="mt-1 rounded border-gray-300"
                          title={
                            r.validationErrors.length
                              ? 'Fix validation errors to include this row'
                              : 'Include in import'
                          }
                        />
                      </td>
                      <td className="p-1 sticky left-0 bg-white">{i + 1}</td>
                      <td className="p-1 align-top">
                        <select
                          value={normalizeQuestionType(r.draft.question_type)}
                          onChange={(e) => updateDraft(r.key, 'question_type', e.target.value)}
                          className="w-full min-w-[108px] border rounded text-gray-900 bg-white text-[10px]"
                          aria-label="Question type"
                        >
                          {QUESTION_TYPE_VALUES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-1">
                        <textarea
                          value={r.draft.question_text}
                          onChange={(e) => updateDraft(r.key, 'question_text', e.target.value)}
                          rows={2}
                          className="w-full border rounded px-1 py-0.5 text-gray-900"
                        />
                        {r.validationErrors.length > 0 && (
                          <p className="text-[10px] text-red-600 mt-0.5">{r.validationErrors.join('; ')}</p>
                        )}
                      </td>
                      <td className="p-1 align-top">
                        <textarea
                          value={r.draft.question_text_odia}
                          onChange={(e) => updateDraft(r.key, 'question_text_odia', e.target.value)}
                          rows={2}
                          className="w-full border rounded px-1 py-0.5 text-gray-900"
                          placeholder="Odia (optional)"
                        />
                      </td>
                      <td className="p-1 space-y-1">
                        {(['option_a', 'option_b', 'option_c', 'option_d'] as const).map((f) => (
                          <input
                            key={f}
                            value={r.draft[f]}
                            onChange={(e) => updateDraft(r.key, f, e.target.value)}
                            disabled={normalizeQuestionType(r.draft.question_type) === 'true_false'}
                            className="w-full border rounded px-1 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder={f}
                          />
                        ))}
                      </td>
                      <td className="p-1 space-y-1">
                        {(
                          ['option_a_odia', 'option_b_odia', 'option_c_odia', 'option_d_odia'] as const
                        ).map((f) => (
                          <input
                            key={f}
                            value={r.draft[f]}
                            onChange={(e) => updateDraft(r.key, f, e.target.value)}
                            disabled={normalizeQuestionType(r.draft.question_type) === 'true_false'}
                            className="w-full border rounded px-1 text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                            placeholder={f}
                          />
                        ))}
                      </td>
                      <td className="p-1">
                        {normalizeQuestionType(r.draft.question_type) === 'true_false' ? (
                          <select
                            value={
                              ['TRUE', 'FALSE'].includes((r.draft.correct_answer || '').toUpperCase())
                                ? (r.draft.correct_answer || '').toUpperCase()
                                : ''
                            }
                            onChange={(e) => updateDraft(r.key, 'correct_answer', e.target.value)}
                            className="w-full min-w-[4.5rem] border rounded text-gray-900 bg-white"
                            aria-label="True or false answer"
                          >
                            <option value="">—</option>
                            <option value="TRUE">TRUE</option>
                            <option value="FALSE">FALSE</option>
                          </select>
                        ) : (
                          <select
                            value={r.draft.correct_answer}
                            onChange={(e) => updateDraft(r.key, 'correct_answer', e.target.value)}
                            className="w-14 border rounded text-gray-900 bg-white"
                            aria-label="Correct option"
                          >
                            <option value="">—</option>
                            {['A', 'B', 'C', 'D'].map((x) => (
                              <option key={x} value={x}>
                                {x}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="p-1">
                        <input
                          type="number"
                          value={r.draft.points}
                          onChange={(e) => updateDraft(r.key, 'points', e.target.value)}
                          className="w-14 border rounded px-1 text-gray-900"
                        />
                      </td>
                      <td className="p-1">
                        <textarea
                          value={r.draft.explanation}
                          onChange={(e) => updateDraft(r.key, 'explanation', e.target.value)}
                          rows={2}
                          className="w-full border rounded px-1 py-0.5 text-gray-900"
                          placeholder="Explanation"
                        />
                      </td>
                      <td className="p-1">
                        <textarea
                          value={r.draft.explanation_odia}
                          onChange={(e) => updateDraft(r.key, 'explanation_odia', e.target.value)}
                          rows={2}
                          className="w-full border rounded px-1 py-0.5 text-gray-900"
                          placeholder="Explanation (Odia)"
                        />
                      </td>
                      <td className="p-1">
                        <select
                          value={r.draft.difficulty_level}
                          onChange={(e) => updateDraft(r.key, 'difficulty_level', e.target.value)}
                          className="w-full border rounded text-gray-900 bg-white"
                        >
                          <option value="easy">easy</option>
                          <option value="medium">medium</option>
                          <option value="hard">hard</option>
                        </select>
                      </td>
                      <td className="p-1">
                        <input
                          value={r.draft.category}
                          onChange={(e) => updateDraft(r.key, 'category', e.target.value)}
                          className="w-full border rounded px-1 text-gray-900"
                          placeholder="Category"
                        />
                      </td>
                      <td className="p-1">
                        <input
                          value={r.draft.tags}
                          onChange={(e) => updateDraft(r.key, 'tags', e.target.value)}
                          className="w-full border rounded px-1 text-gray-900"
                          placeholder="tag1, tag2"
                        />
                      </td>
                      <td className="p-1 text-[10px]">
                        {r.dupExistingId && <span className="text-amber-700">DB</span>}
                        {r.dupInBatch && <span className="text-orange-700"> Batch</span>}
                        {!r.dupExistingId && !r.dupInBatch && '—'}
                      </td>
                      <td className="p-1">
                        {(r.dupExistingId || r.dupInBatch) && (
                          <select
                            value={r.duplicateAction}
                            onChange={(e) =>
                              setRowDupAction(
                                r.key,
                                e.target.value as 'skip' | 'insert' | 'overwrite'
                              )
                            }
                            className="w-full border rounded text-gray-900 bg-white text-[10px]"
                          >
                            <option value="skip">Skip</option>
                            {!r.dupInBatch && r.dupExistingId && (
                              <option value="overwrite">Overwrite</option>
                            )}
                            <option value="insert">Insert anyway</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4 text-sm text-gray-700">
            <p className="font-medium text-gray-900">Ready to import</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>{importSummary.willImport}</strong> question(s) will be saved to the bank
              </li>
              <li>
                <strong>{importSummary.willSkipDup}</strong> selected row(s) skipped (duplicate policy)
              </li>
              <li>
                <strong>{previewRows.length - selectedCount}</strong> row(s) not selected
              </li>
              {importSummary.invalidSelected > 0 && (
                <li className="text-red-600">
                  <strong>{importSummary.invalidSelected}</strong> selected row(s) still invalid — go back and fix
                  or uncheck
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-gray-100 mt-auto shrink-0">
        <div className="flex gap-2">
          {step !== 'upload' && (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => {
                if (step === 'confirm') setStep('preview')
                else if (step === 'preview') setStep(source === 'pdf' ? 'upload' : 'mapping')
                else if (step === 'mapping') setStep('upload')
              }}
            >
              Back
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {step === 'upload' && (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!file || extracting}
              isLoading={extracting}
              onClick={runExtract}
            >
              Parse file
            </Button>
          )}
          {step === 'mapping' && (
            <Button type="button" variant="primary" size="md" onClick={applyMappingAndPreview}>
              Next: preview
            </Button>
          )}
          {step === 'preview' && (
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={selectedCount === 0}
              onClick={() => setStep('confirm')}
            >
              Next: confirm
            </Button>
          )}
          {step === 'confirm' && (
            <Button
              type="button"
              variant="primary"
              size="md"
              isLoading={importing}
              disabled={
                importing ||
                importSummary.willImport === 0 ||
                importSummary.invalidSelected > 0
              }
              onClick={runImport}
            >
              Import selected
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
