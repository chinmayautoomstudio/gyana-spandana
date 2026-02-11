'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface ExamTimerProps {
  durationSeconds: number
  onTimeUp?: () => void
  onTick?: (seconds: number) => void
  onWarning?: (secondsRemaining: number) => void
  isActive?: boolean
  className?: string
}

export const ExamTimer: React.FC<ExamTimerProps> = ({
  durationSeconds,
  onTimeUp,
  onTick,
  onWarning,
  isActive = true,
  className = ''
}) => {
  const [timeRemaining, setTimeRemaining] = useState(durationSeconds)
  const [isWarning, setIsWarning] = useState(false)
  const [isCritical, setIsCritical] = useState(false)

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Get timer color based on remaining time
  const getTimerColor = (): string => {
    if (isCritical) return 'text-red-700'
    if (isWarning) return 'text-yellow-700'
    return 'text-[#C0392B]'
  }

  // Get timer background color
  const getTimerBgColor = (): string => {
    if (isCritical) return 'bg-red-500/10 border-red-500'
    if (isWarning) return 'bg-yellow-500/10 border-yellow-500'
    return 'bg-[#C0392B]/10 border-[#C0392B]'
  }

  // Update timer
  const updateTimer = useCallback(() => {
    if (!isActive || timeRemaining <= 0) return

    setTimeRemaining(prev => {
      const newTime = prev - 1

      onTick?.(newTime)

      // Check for warnings
      if (newTime === 300 && prev > 300) { // 5 minutes remaining
        setIsWarning(true)
        onWarning?.(300)
      } else if (newTime === 60 && prev > 60) { // 1 minute remaining
        setIsCritical(true)
        onWarning?.(60)
      }

      // Time's up
      if (newTime <= 0) {
        onTimeUp?.()
        return 0
      }

      return newTime
    })
  }, [isActive, timeRemaining, onTimeUp, onWarning, onTick])

  // Timer effect
  useEffect(() => {
    if (!isActive) return

    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isActive, updateTimer])

  // Reset timer when duration changes
  useEffect(() => {
    setTimeRemaining(durationSeconds)
    setIsWarning(false)
    setIsCritical(false)
  }, [durationSeconds])

  // Calculate progress percentage
  const progressPercentage = durationSeconds > 0
    ? ((durationSeconds - timeRemaining) / durationSeconds) * 100
    : 0

  return (
    <div className={`px-4 py-2 rounded-lg border-2 font-mono text-lg font-bold transition-all ${getTimerBgColor()} ${getTimerColor()} ${className}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatTime(timeRemaining)}</span>
        </div>
        <div className="text-xs font-normal">
          {isActive ? 'Time Remaining' : 'Timer Paused'}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 w-full bg-gray-200 rounded-full h-1">
        <div
          className={`h-1 rounded-full transition-all ${isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-[#C0392B]'
            }`}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Warning indicators */}
      {isWarning && (
        <div className={`mt-2 text-xs flex items-center gap-1 ${isCritical ? 'text-red-700' : 'text-yellow-700'}`}>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{timeRemaining <= 60 ? '1 min remaining!' : '5 min remaining!'}</span>
        </div>
      )}
    </div>
  )
}

export default ExamTimer
