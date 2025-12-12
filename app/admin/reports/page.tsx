'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

interface Exam {
  id: string
  title: string
  status: string
}

export default function ReportsPage() {
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchExams = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('exams')
        .select('id, title, status')
        .order('created_at', { ascending: false })

      setExams(data || [])
      setLoading(false)
    }

    fetchExams()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C0392B]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate and download detailed reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <Link
            key={exam.id}
            href={`/admin/reports/exam/${exam.id}`}
            className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">{exam.title}</h3>
            <p className="text-sm text-gray-600 mb-4">Generate comprehensive exam report</p>
            <span className={`inline-block px-2 py-1 text-xs rounded ${
              exam.status === 'completed' ? 'bg-green-100 text-green-800' :
              exam.status === 'active' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {exam.status}
            </span>
          </Link>
        ))}
      </div>

      {exams.length === 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 text-center">
          <p className="text-gray-500">No exams available for reporting</p>
        </div>
      )}
    </div>
  )
}

