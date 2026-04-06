'use client'

export type ImportBatchRow = {
  id: string
  created_at: string
  filename: string
  source: string
  row_count: number
  inserted_count: number
  skipped_count: number
  status: string
}

export function RecentImportsPanel({ batches }: { batches: ImportBatchRow[] }) {
  if (batches.length === 0) return null

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent imports</h3>
      <ul className="space-y-2 text-sm">
        {batches.map((b) => (
          <li
            key={b.id}
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 pb-2 last:border-0 last:pb-0"
          >
            <span className="text-gray-900 font-medium truncate max-w-[200px]" title={b.filename}>
              {b.filename}
            </span>
            <span className="text-xs text-gray-500 uppercase">{b.source}</span>
            <span className="text-xs text-gray-600 w-full sm:w-auto">
              {new Date(b.created_at).toLocaleString()} · {b.inserted_count} inserted
              {b.skipped_count > 0 ? `, ${b.skipped_count} skipped` : ''}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
