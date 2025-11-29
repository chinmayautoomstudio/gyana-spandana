'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'

interface Exam {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  total_questions: number
  status: string
  scheduled_start: string | null
  scheduled_end: string | null
  created_at: string
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExams = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching exams:', error)
      } else {
        setExams(data || [])
      }
      setLoading(false)
    }

    fetchExams()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-700 border-green-200'
      case 'scheduled':
        return 'bg-[#C0392B]/10 text-[#C0392B] border-[#C0392B]/30'
      case 'completed':
        return 'bg-gray-500/10 text-gray-700 border-gray-200'
      case 'draft':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-200'
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled'
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Exams</h1>
        <Link href="/admin/exams/new">
          <Button variant="primary" size="lg">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Exam
          </Button>
        </Link>
      </div>

      {exams.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No exams yet</h3>
          <p className="text-gray-500 mb-6">Create your first exam to get started</p>
          <Link href="/admin/exams/new">
            <Button variant="primary">Create Exam</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/exams/${exam.id}`}
              className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 hover:shadow-xl transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(exam.status)}`}>
                      {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                    </span>
                  </div>
                  {exam.description && (
                    <p className="text-gray-600 mb-4">{exam.description}</p>
                  )}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="font-medium text-gray-900">{exam.duration_minutes} minutes</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Questions:</span>
                      <p className="font-medium text-gray-900">{exam.total_questions}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Starts:</span>
                      <p className="font-medium text-gray-900">{formatDate(exam.scheduled_start)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Ends:</span>
                      <p className="font-medium text-gray-900">{formatDate(exam.scheduled_end)}</p>
                    </div>
                  </div>
                </div>
                <svg className="w-5 h-5 text-gray-400 ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

