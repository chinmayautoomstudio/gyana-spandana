'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  ALL_SENT_EMAIL_TYPES,
  SENT_EMAIL_TYPE_LABELS,
  type SentEmailType,
} from '@/lib/email/email-types'
import type { SentEmailRow } from '@/lib/email/sent-email-row'
import { Button } from '@/components/ui/Button'

function buildQuery(page: number, typeFilter: string | null, q: string): string {
  const p = new URLSearchParams()
  if (page > 1) p.set('page', String(page))
  if (typeFilter) p.set('type', typeFilter)
  if (q.trim()) p.set('q', q.trim())
  const s = p.toString()
  return s ? `?${s}` : ''
}

export function EmailLogClient(props: {
  rows: SentEmailRow[]
  page: number
  totalPages: number
  total: number
  typeFilter: SentEmailType | null
  q: string
}) {
  const { rows, page, totalPages, total, typeFilter, q } = props
  const [preview, setPreview] = useState<SentEmailRow | null>(null)

  const typeOptions = useMemo(
    () =>
      ALL_SENT_EMAIL_TYPES.map((t) => ({
        value: t,
        label: SENT_EMAIL_TYPE_LABELS[t],
      })),
    []
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sent emails</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Transactional messages sent via SendGrid from this app. New entries appear after successful delivery.
        </p>
      </div>

      <div
        className="mb-6 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950"
        role="note"
      >
        <p className="font-semibold text-amber-900">Password reset emails</p>
        <p className="mt-1 text-amber-900/90">
          Password reset is handled by{' '}
          <strong>Supabase Auth</strong>, not SendGrid routes here. Those messages are not stored in this log.
          Customize them in the Supabase dashboard under{' '}
          <strong>Authentication → Email templates</strong>. A local reference copy lives at{' '}
          <code className="rounded bg-white/80 px-1 py-0.5 text-xs">public/email-templates/reset-password.html</code>.
        </p>
      </div>

      <form
        method="get"
        action="/admin/email-log"
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="type" className="text-xs font-medium text-gray-600">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={typeFilter ?? ''}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm min-w-[220px]"
          >
            <option value="">All types</option>
            {typeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label htmlFor="q" className="text-xs font-medium text-gray-600">
            Recipient contains
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="email@example.com"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm w-full max-w-md"
          />
        </div>
        <Button type="submit" variant="primary" className="sm:mb-0">
          Apply filters
        </Button>
        {(typeFilter || q) && (
          <Link
            href="/admin/email-log"
            className="text-sm text-[#C0392B] hover:underline py-2 sm:py-0"
          >
            Clear filters
          </Link>
        )}
      </form>

      <p className="text-sm text-gray-600 mb-3">
        Showing {rows.length} of {total} {total === 1 ? 'message' : 'messages'}
        {totalPages > 1 ? ` · Page ${page} of ${totalPages}` : ''}
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="px-4 py-3 font-semibold text-gray-700">Sent</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Type</th>
              <th className="px-4 py-3 font-semibold text-gray-700">To</th>
              <th className="px-4 py-3 font-semibold text-gray-700">Subject</th>
              <th className="px-4 py-3 font-semibold text-gray-700 w-28">Preview</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  No sent emails match your filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const label =
                  (SENT_EMAIL_TYPE_LABELS as Record<string, string>)[row.email_type] ??
                  row.email_type
                return (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/80">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {format(new Date(row.sent_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{label}</td>
                    <td className="px-4 py-3 text-gray-800 break-all max-w-[200px]">{row.to_email}</td>
                    <td className="px-4 py-3 text-gray-800 max-w-md truncate" title={row.subject}>
                      {row.subject}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setPreview(row)}
                        className="text-[#C0392B] font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 justify-center">
          {page > 1 && (
            <Link
              href={`/admin/email-log${buildQuery(page - 1, typeFilter, q)}`}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/email-log${buildQuery(page + 1, typeFilter, q)}`}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
            >
              Next
            </Link>
          )}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-labelledby="email-preview-title"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 p-4 border-b border-gray-200">
              <div className="min-w-0">
                <h2 id="email-preview-title" className="font-semibold text-gray-900 truncate">
                  {preview.subject}
                </h2>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  To: {preview.to_email} ·{' '}
                  {(SENT_EMAIL_TYPE_LABELS as Record<string, string>)[preview.email_type] ??
                    preview.email_type}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 shrink-0"
                aria-label="Close preview"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 p-4">
              <iframe
                title="Email HTML preview"
                sandbox=""
                className="w-full h-[min(70vh,600px)] border border-gray-200 rounded-lg bg-white"
                srcDoc={preview.html_body}
              />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <Button type="button" variant="secondary" onClick={() => setPreview(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
