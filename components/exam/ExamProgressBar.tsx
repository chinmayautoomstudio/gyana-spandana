'use client'

import React from 'react'

interface ExamProgressBarProps {
  currentQuestion: number
  totalQuestions: number
  answeredQuestions: number
  timeRemaining: number // in seconds
  totalDuration: number // in seconds
}

export const ExamProgressBar: React.FC<ExamProgressBarProps> = ({
  currentQuestion,
  totalQuestions,
  answeredQuestions,
  timeRemaining,
  totalDuration
}) => {
  const progressPercentage = totalQuestions > 0 
    ? (answeredQuestions / totalQuestions) * 100 
    : 0
  
  const timeProgressPercentage = totalDuration > 0
    ? ((totalDuration - timeRemaining) / totalDuration) * 100
    : 0

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = (): string => {
    if (timeRemaining <= 300) return 'text-red-700' // 5 minutes
    if (timeRemaining <= 600) return 'text-yellow-700' // 10 minutes
    return 'text-blue-700'
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Exam Progress</h3>
        <div className={`text-lg font-mono font-bold ${getTimeColor()}`}>
          {formatTime(timeRemaining)}
        </div>
      </div>

      {/* Main progress section */}
      <div className="space-y-4">
        {/* Questions progress */}
        <div>
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Questions Progress</span>
            <span>{answeredQuestions} of {totalQuestions} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-[#C0392B] h-2 rounded-full transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Progress: {Math.round(progressPercentage)}%</span>
            <span>{totalQuestions - answeredQuestions} remaining</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{answeredQuestions}</div>
            <div className="text-xs text-gray-600">Answered</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalQuestions - answeredQuestions}</div>
            <div className="text-xs text-gray-600">Remaining</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#C0392B]">{currentQuestion}</div>
            <div className="text-xs text-gray-600">Current</div>
          </div>
        </div>

        {/* Time progress */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Time Progress</span>
            <span>{formatTime(totalDuration - timeRemaining)} elapsed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{ width: `${timeProgressPercentage}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Time Used: {Math.round(timeProgressPercentage)}%</span>
            <span>{formatTime(timeRemaining)} remaining</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExamProgressBar
