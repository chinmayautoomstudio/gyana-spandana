interface Round {
  id: string
  round_order: number
  title: string | null
  round_type: string
  status: string
}

interface RoundNavigatorProps {
  rounds: Round[]
  activeRoundId?: string | null
  onSelectRound?: (roundId: string) => void
}

export function RoundNavigator({ rounds, activeRoundId, onSelectRound }: RoundNavigatorProps) {
  return (
    <aside className="space-y-2">
      {rounds.map((round) => {
        const isActive = round.id === activeRoundId
        return (
          <button
            key={round.id}
            type="button"
            onClick={() => onSelectRound?.(round.id)}
            className={`w-full rounded-xl border p-3 text-left transition ${
              isActive ? 'border-[#C0392B] bg-[#C0392B]/5' : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <p className="text-xs font-semibold uppercase text-gray-500">Round {round.round_order}</p>
            <p className="text-sm font-semibold text-gray-900">{round.title || round.round_type}</p>
            <p className="text-xs text-gray-500">{round.round_type}</p>
            <p className="mt-1 text-xs font-medium text-gray-700">Status: {round.status}</p>
          </button>
        )
      })}
    </aside>
  )
}

