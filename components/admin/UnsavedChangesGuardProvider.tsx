'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type PendingAction = () => void

interface UnsavedChangesGuardContextValue {
  isBlocking: boolean
  setIsBlocking: (value: boolean) => void
  confirmOrRun: (action: PendingAction) => void
}

const UnsavedChangesGuardContext = createContext<UnsavedChangesGuardContextValue | null>(null)

export function UnsavedChangesGuardProvider({ children }: { children: ReactNode }) {
  const [isBlocking, setIsBlocking] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const pendingActionRef = useRef<PendingAction | null>(null)

  const closeModal = useCallback(() => {
    pendingActionRef.current = null
    setIsModalOpen(false)
  }, [])

  const confirmOrRun = useCallback(
    (action: PendingAction) => {
      if (!isBlocking) {
        action()
        return
      }

      pendingActionRef.current = action
      setIsModalOpen(true)
    },
    [isBlocking]
  )

  const handleExit = useCallback(() => {
    const pending = pendingActionRef.current
    pendingActionRef.current = null
    setIsBlocking(false)
    setIsModalOpen(false)
    if (pending) pending()
  }, [])

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isBlocking) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isBlocking])

  const value = useMemo(
    () => ({
      isBlocking,
      setIsBlocking,
      confirmOrRun,
    }),
    [isBlocking, confirmOrRun]
  )

  return (
    <UnsavedChangesGuardContext.Provider value={value}>
      {children}

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-creation-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/20 bg-white p-6 shadow-2xl">
            <h2 id="leave-creation-title" className="text-lg font-semibold text-gray-900">
              Leave exam/quiz creation?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              You are leaving the exam/quiz creation process. Unsaved progress may be lost.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Continue creating
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="inline-flex items-center justify-center rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-medium text-white hover:bg-[#A93226]"
              >
                Exit exam creation
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </UnsavedChangesGuardContext.Provider>
  )
}

export function useUnsavedChangesGuard() {
  const context = useContext(UnsavedChangesGuardContext)
  if (!context) {
    throw new Error('useUnsavedChangesGuard must be used inside UnsavedChangesGuardProvider')
  }
  return context
}
