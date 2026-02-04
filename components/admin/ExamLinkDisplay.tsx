'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/Button'

interface ExamLinkDisplayProps {
  examId: string
  examTitle: string
  className?: string
}

export const ExamLinkDisplay: React.FC<ExamLinkDisplayProps> = ({
  examId,
  examTitle,
  className = ''
}) => {
  const [copied, setCopied] = useState(false)

  // Generate exam URL
  const siteUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const examUrl = `${siteUrl}/exams/${examId}/take`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(examUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy link:', error)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = examUrl
      textArea.style.position = 'fixed'
      textArea.style.opacity = '0'
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('Fallback copy failed:', err)
      }
      document.body.removeChild(textArea)
    }
  }

  return (
    <div className={`bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-bold text-gray-900 mb-4">Exam Link</h3>
      <p className="text-sm text-gray-600 mb-3">
        Share this link with participants. They must be logged in and assigned to this exam to access it.
      </p>
      
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-2">
          <code className="text-sm text-gray-900 break-all">{examUrl}</code>
        </div>
        <Button
          variant={copied ? 'secondary' : 'primary'}
          size="md"
          onClick={handleCopy}
          className="flex-shrink-0"
        >
          {copied ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </>
          )}
        </Button>
      </div>

      <div className="text-xs text-gray-500 space-y-1">
        <p>• Participants must be logged in to access the exam</p>
        <p>• Only assigned participants can take the exam</p>
        <p>• Exam link is valid as long as the exam is active or scheduled</p>
      </div>
    </div>
  )
}

export default ExamLinkDisplay
