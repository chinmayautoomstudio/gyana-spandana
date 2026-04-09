/**
 * Full-viewport branded loader for route-level loading.tsx and standalone use.
 */
export function PageLoader({
  title = 'GYANA SPARDHA',
  subtitle = 'Loading…',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div 
      className="min-h-[100dvh] bg-[#ECF0F1] flex flex-col items-center justify-center px-4"
      style={{
        backgroundColor: '#ECF0F1',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: '1rem',
        paddingRight: '1rem'
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white/75 backdrop-blur-xl border border-white/30 shadow-xl p-10 text-center"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C0392B] to-[#E67E22] shadow-lg">
          <span className="sr-only">{subtitle}</span>
          <svg
            className="h-7 w-7 text-white animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <p className="text-lg font-bold bg-gradient-to-r from-[#C0392B] to-[#E67E22] bg-clip-text text-transparent">
          {title}
        </p>
        <p className="mt-2 text-sm text-gray-600">{subtitle}</p>
        <div className="mt-6 flex justify-center gap-1.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-[#C0392B]/40 animate-pulse"
              style={{ animationDelay: `${i * 160}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
