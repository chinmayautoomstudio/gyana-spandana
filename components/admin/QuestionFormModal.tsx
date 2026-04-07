'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { type Question } from '@/components/admin/QuestionCard'
import { QuestionForm } from '@/components/admin/QuestionForm'
import type { ImportCompleteResult } from '@/components/admin/QuestionImportFlow'

const QuestionImportFlow = dynamic(
  () => import('@/components/admin/QuestionImportFlow').then((m) => m.QuestionImportFlow),
  { ssr: false }
)

type Tab = 'manual' | 'import'

type QuestionFormModalProps = {
  open: boolean
  question: Question | null
  bankTextToId: Map<string, string>
  onClose: () => void
  onSuccess: () => void
}

export function QuestionFormModal({
  open,
  question,
  bankTextToId,
  onClose,
  onSuccess,
}: QuestionFormModalProps) {
  const [tab, setTab] = useState<Tab>('manual')
  const [manualDirty, setManualDirty] = useState(false)
  const [importActive, setImportActive] = useState(false)
  const [importFlowKey, setImportFlowKey] = useState(0)
  const [manualFormKey, setManualFormKey] = useState(0)

  const isAdd = !question

  useEffect(() => {
    if (!open) return
    setTab('manual')
    setManualDirty(false)
    setImportActive(false)
    setImportFlowKey((k) => k + 1)
    setManualFormKey((k) => k + 1)
  }, [open, question?.id])

  const trySetTab = useCallback(
    (next: Tab) => {
      if (next === tab) return
      const leavingManualDirty = tab === 'manual' && next === 'import' && manualDirty && isAdd
      const leavingImportActive = tab === 'import' && next === 'manual' && importActive
      if (
        (leavingManualDirty || leavingImportActive) &&
        !window.confirm('Switch tabs? Your current input will be cleared.')
      ) {
        return
      }
      if (leavingManualDirty) {
        setManualFormKey((k) => k + 1)
        setManualDirty(false)
      }
      if (leavingImportActive) {
        setImportFlowKey((k) => k + 1)
        setImportActive(false)
      }
      setTab(next)
    },
    [tab, manualDirty, importActive, isAdd]
  )

  const handleClose = () => {
    onClose()
  }

  const handleImportComplete = (r: ImportCompleteResult) => {
    toast.success(`${r.inserted} question(s) imported successfully`)
    onSuccess()
    onClose()
  }

  const handleManualSuccess = () => {
    toast.success('Question saved')
    onSuccess()
    onClose()
  }

  if (!open) return null

  const showImportTab = isAdd
  const importTabActive = showImportTab && tab === 'import'
  const shellTall = importTabActive

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={handleClose}
      />
      <div
        className={`relative w-full max-w-3xl rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 bg-white flex flex-col ${
          shellTall ? 'h-[80vh] max-h-[80vh] sm:h-[80vh]' : 'max-h-[95vh] sm:max-h-[90vh]'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-form-modal-title"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 id="question-form-modal-title" className="text-lg font-semibold text-gray-900">
            {question ? 'Edit Question' : 'Add Question'}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {showImportTab && (
          <div
            role="tablist"
            aria-label="Question entry mode"
            className="flex gap-1 px-4 sm:px-6 pt-2 border-b border-gray-100 shrink-0"
          >
            <button
              type="button"
              role="tab"
              id="tab-manual"
              aria-selected={tab === 'manual'}
              aria-controls="tab-panel-manual"
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                tab === 'manual'
                  ? 'border-[#C0392B] text-[#C0392B] bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => trySetTab('manual')}
            >
              Manual entry
            </button>
            <button
              type="button"
              role="tab"
              id="tab-import"
              aria-selected={tab === 'import'}
              aria-controls="tab-panel-import"
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 -mb-px transition-colors ${
                tab === 'import'
                  ? 'border-[#C0392B] text-[#C0392B] bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => trySetTab('import')}
            >
              Import from file
            </button>
          </div>
        )}

        <div
          className={`flex-1 min-h-0 overflow-y-auto ${importTabActive ? 'flex flex-col' : ''}`}
          id={
            !showImportTab
              ? undefined
              : tab === 'manual'
                ? 'tab-panel-manual'
                : 'tab-panel-import'
          }
          role={showImportTab ? 'tabpanel' : undefined}
          aria-labelledby={
            !showImportTab
              ? 'question-form-modal-title'
              : tab === 'manual'
                ? 'tab-manual'
                : 'tab-import'
          }
        >
          {(tab === 'manual' || !showImportTab) && (
            <div className="p-4 sm:p-6">
              <QuestionForm
                key={`${question?.id ?? 'new'}-${manualFormKey}`}
                examId={question?.exam_id ?? undefined}
                question={question}
                onClose={handleClose}
                onSuccess={handleManualSuccess}
                allowNoExam
                embeddedInModal
                onInteraction={() => setManualDirty(true)}
              />
            </div>
          )}

          {showImportTab && tab === 'import' && (
            <div className="flex flex-col flex-1 min-h-0 px-4 sm:px-6 pb-4 pt-2">
              <QuestionImportFlow
                key={importFlowKey}
                bankTextToId={bankTextToId}
                onComplete={handleImportComplete}
                onActivityChange={setImportActive}
                className="flex-1 min-h-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
