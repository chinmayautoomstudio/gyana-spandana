import { createAdminClient } from '@/lib/supabase/admin'
import { ALL_SENT_EMAIL_TYPES, type SentEmailType } from '@/lib/email/email-types'
import type { SentEmailRow } from '@/lib/email/sent-email-row'
import { EmailLogClient } from './EmailLogClient'

const PAGE_SIZE = 50

type SearchParams = { type?: string; q?: string; page?: string }

export default async function EmailLogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || '1', 10) || 1)
  const typeFilter =
    sp.type && ALL_SENT_EMAIL_TYPES.includes(sp.type as SentEmailType)
      ? (sp.type as SentEmailType)
      : null
  const q = (sp.q || '').trim()

  const supabase = createAdminClient()
  let query = supabase
    .from('sent_emails')
    .select('*', { count: 'exact' })
    .order('sent_at', { ascending: false })

  if (typeFilter) {
    query = query.eq('email_type', typeFilter)
  }
  if (q) {
    query = query.ilike('to_email', `%${q}%`)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: rows, error, count } = await query.range(from, to)

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-xl font-bold text-gray-900">Sent emails</h1>
        <p className="mt-4 text-red-600">
          Failed to load email log: {error.message}. If the table is missing, apply the migration{' '}
          <code className="text-sm bg-gray-100 px-1 rounded">supabase/migrations/20260410120000_sent_emails.sql</code>.
        </p>
      </div>
    )
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <EmailLogClient
      rows={(rows ?? []) as SentEmailRow[]}
      page={page}
      totalPages={totalPages}
      total={total}
      typeFilter={typeFilter}
      q={q}
    />
  )
}
