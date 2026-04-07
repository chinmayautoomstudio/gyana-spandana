/** Shown via `app/admin/loading.tsx` during admin segment navigations */
export function AdminRouteSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="h-10 w-64 rounded-lg bg-white/60 border border-white/20" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-white/60 border border-white/20" />
        ))}
      </div>
      <div className="h-64 rounded-2xl bg-white/60 border border-white/20" />
      <div className="h-96 rounded-2xl bg-white/60 border border-white/20" />
    </div>
  )
}
