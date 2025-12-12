'use client'

import { AssistantChat } from '@/components/admin/AssistantChat'

export default function AssistantPage() {
  return (
    <div className="space-y-4">
      <div className="mb-2">
        <h1 className="text-xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-gray-600 text-sm mt-0.5">Ask questions about participants, exams, questions, performance, and more</p>
      </div>

      <div className="h-[calc(100vh-200px)] min-h-[600px]">
        <AssistantChat />
      </div>

      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-3">Example Queries</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Participant Queries</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "Show me all participants"</li>
              <li>• "Find participant named John"</li>
              <li>• "What is the performance of participant [name]?"</li>
              <li>• "Show participants from [school name]"</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Performance & Statistics</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "What are the overall statistics?"</li>
              <li>• "Show exam statistics"</li>
              <li>• "What is the average score?"</li>
              <li>• "Show me the leaderboard"</li>
            </ul>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="font-semibold text-sm text-gray-700 mb-2">Question Bank Queries</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• "How many questions are there total in question bank?"</li>
            <li>• "Show questions by category"</li>
            <li>• "What's the difficulty distribution of questions?"</li>
            <li>• "How many questions are in exam [name]?"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

