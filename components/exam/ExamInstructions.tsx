'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'

interface ExamInstructionsProps {
  isOpen: boolean
  onClose: () => void
  onStartExam: () => void
  examDetails: {
    title: string
    duration: number
    totalQuestions: number
  }
  canStart?: boolean
}

export const ExamInstructions: React.FC<ExamInstructionsProps> = ({
  isOpen,
  onClose,
  onStartExam,
  examDetails,
  canStart = true
}) => {
  if (!isOpen) return null

  const instructions = [
    {
      title: "Time Management",
      items: [
        `You have ${examDetails.duration} minute${examDetails.duration !== 1 ? 's' : ''} to complete the exam`,
        "Timer will be displayed at the top of the screen",
        "Auto-submit when time expires",
        "No time extensions will be provided"
      ]
    },
    {
      title: "Question Types",
      items: [
        "Multiple Choice Questions (MCQs) - Select one correct answer",
        "Questions are displayed one at a time",
        "You can navigate between questions using the question navigator"
      ]
    },
    {
      title: "Answering Guidelines",
      items: [
        "Read each question carefully before answering",
        "For MCQs, select the most appropriate option",
        "You can navigate between questions using the question navigator",
        "Answers are auto-saved every 2 seconds"
      ]
    },
    {
      title: "Exam Integrity",
      items: [
        "Do not switch tabs or minimize the browser window",
        "Do not use external resources or assistance",
        "Do not communicate with others during the exam",
        "Your session is monitored for security purposes",
        "Fullscreen mode is required to start the exam"
      ]
    },
    {
      title: "Technical Requirements",
      items: [
        "Ensure stable internet connection",
        "Use a desktop or laptop computer (mobile not recommended)",
        "Close unnecessary applications and browser tabs",
        "Enable JavaScript and cookies in your browser"
      ]
    }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Exam Instructions</h2>
              <p className="text-gray-600 mt-1">Please read all instructions carefully before starting</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Exam Details */}
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Exam Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500">Exam Title</p>
              <p className="font-medium text-gray-900">{examDetails.title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium text-gray-900">{examDetails.duration} minutes</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Questions</p>
              <p className="font-medium text-gray-900">{examDetails.totalQuestions} questions</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Important Instructions</h3>
          <div className="space-y-6">
            {instructions.map((section, index) => (
              <div key={index}>
                <h4 className="font-semibold text-gray-900 mb-2">{section.title}</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex} className="text-sm">{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Important Notice */}
        <div className="p-6 bg-yellow-50 border-t border-yellow-200">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="font-semibold text-yellow-900 mb-1">Important Notice</h4>
              <p className="text-sm text-yellow-800">
                This exam is designed to assess your knowledge. Please ensure you have a stable internet connection 
                and are in a quiet environment. Any attempt to cheat or use unauthorized resources will result in immediate 
                disqualification. Your exam session is monitored for security purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex gap-4 justify-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onStartExam}
            disabled={!canStart}
          >
            Start Exam
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ExamInstructions
