/** Shared pulse block for skeleton UIs */
function ShimmerBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/60 border border-white/25 ${className}`} aria-hidden />
}

/** Auth routes: card + form field placeholders */
export function AuthPageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#ECF0F1] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6 animate-pulse" aria-hidden>
        <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-[#C0392B]/30 to-[#E67E22]/30" />
        <ShimmerBlock className="h-8 w-48 mx-auto" />
        <ShimmerBlock className="h-4 w-64 mx-auto" />
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/25 shadow-lg p-8 space-y-4">
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}

/** Exams list: header + grid of cards */
export function ExamsPageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#ECF0F1] p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse" aria-hidden>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <ShimmerBlock className="h-10 w-56" />
        <ShimmerBlock className="h-10 w-32" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <ShimmerBlock key={i} className="h-40" />
        ))}
      </div>
    </div>
  )
}

/** Profile edit: two-column form layout */
export function ProfilePageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#ECF0F1] p-4 sm:p-6 lg:p-8 animate-pulse" aria-hidden>
      <ShimmerBlock className="h-10 w-48 mb-8" />
      <div className="grid gap-6 lg:grid-cols-3 max-w-5xl mx-auto">
        <ShimmerBlock className="h-64 lg:col-span-1" />
        <div className="lg:col-span-2 space-y-4">
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-24 w-full" />
          <ShimmerBlock className="h-11 w-40" />
        </div>
      </div>
    </div>
  )
}

/** Team create / multi-step flows */
export function TeamPageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#ECF0F1] flex flex-col lg:flex-row animate-pulse" aria-hidden>
      <div className="hidden lg:block lg:w-2/5 min-h-[200px] bg-gray-800/10" />
      <div className="flex-1 p-6 sm:p-10 space-y-6">
        <div className="flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <ShimmerBlock key={i} className="h-2 flex-1 rounded-full" />
          ))}
        </div>
        <ShimmerBlock className="h-9 w-3/4 max-w-md" />
        <div className="space-y-4 max-w-xl">
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-12 w-full" />
          <ShimmerBlock className="h-11 w-36" />
        </div>
      </div>
    </div>
  )
}

/** Register / marketing-style form */
export function RegisterPageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#ECF0F1] py-12 px-4 animate-pulse" aria-hidden>
      <div className="max-w-lg mx-auto space-y-6">
        <ShimmerBlock className="h-10 w-44 mx-auto" />
        <div className="rounded-2xl bg-white/70 backdrop-blur-xl border border-white/25 p-8 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <ShimmerBlock key={i} className="h-11 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Contact / simple content page */
export function ContactPageSkeleton() {
  return (
    <div className="min-h-[100dvh] bg-[#ECF0F1] py-16 px-4 animate-pulse" aria-hidden>
      <div className="max-w-2xl mx-auto space-y-6">
        <ShimmerBlock className="h-12 w-2/3" />
        <ShimmerBlock className="h-4 w-full" />
        <ShimmerBlock className="h-4 w-5/6" />
        <div className="rounded-2xl bg-white/70 border border-white/25 p-8 space-y-4 mt-8">
          <ShimmerBlock className="h-11 w-full" />
          <ShimmerBlock className="h-11 w-full" />
          <ShimmerBlock className="h-32 w-full" />
          <ShimmerBlock className="h-11 w-32" />
        </div>
      </div>
    </div>
  )
}
