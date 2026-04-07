/** Skeleton layout while dashboard data loads (sidebar + content placeholders) */
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#ECF0F1] flex animate-pulse">
      <aside className="hidden lg:block w-64 bg-white/50 border-r border-white/20" />
      <div className="flex-1">
        <header className="h-16 bg-white/50 border-b border-white/20" />
        <main className="p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 rounded-2xl bg-white/40 border border-white/20" />
            <div className="h-96 rounded-2xl bg-white/40 border border-white/20" />
          </div>
          <div className="h-48 rounded-2xl bg-white/40 border border-white/20" />
        </main>
      </div>
    </div>
  )
}
