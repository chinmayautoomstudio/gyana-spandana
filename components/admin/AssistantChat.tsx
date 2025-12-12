'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
}

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI assistant. I can help you query information about participants, exams, questions, performance statistics, and more. What would you like to know?',
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load conversation history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('assistant_conversation')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
          })))
        }
      } catch (e) {
        console.error('Failed to load conversation history:', e)
      }
    }
  }, [])

  // Save conversation history to localStorage
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('assistant_conversation', JSON.stringify(messages))
    }
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    try {
      // Prepare conversation history for API (excluding timestamps)
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
      }))

      const response = await fetch('/api/admin/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          conversationHistory,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to get response')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (err: any) {
      setError(err.message || 'An error occurred')
      const errorMessage: Message = {
        role: 'assistant',
        content: `Sorry, I encountered an error: ${err.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the conversation?')) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I\'m your AI assistant. I can help you query information about participants, exams, questions, performance statistics, and more. What would you like to know?',
          timestamp: new Date(),
        },
      ])
      localStorage.removeItem('assistant_conversation')
      setError(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`
    }
  }

  return (
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-gradient-to-r from-[#C0392B]/10 to-[#E67E22]/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-full flex items-center justify-center text-white font-bold text-lg">
            AI
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-600">Ask me anything about participants, exams, questions, and performance</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          className="text-xs"
        >
          Clear Chat
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-[#C0392B] to-[#E67E22] text-white'
                  : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-white/20'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              {message.timestamp && (
                <p
                  className={`text-xs mt-1 ${
                    message.role === 'user' ? 'text-white/70' : 'text-gray-500'
                  }`}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/20">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#C0392B]"></div>
                <span className="text-sm text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/20 bg-white/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about participants, exams, questions, or performance..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C0392B]/50 focus:border-transparent resize-none text-sm overflow-y-auto disabled:bg-gray-100 disabled:text-gray-500"
            rows={1}
            style={{ minHeight: '48px', maxHeight: '120px' }}
            disabled={loading}
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-[#C0392B] to-[#E67E22] hover:from-[#A93226] hover:to-[#D35400] px-6"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  )
}

