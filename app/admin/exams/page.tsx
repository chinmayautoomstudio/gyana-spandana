'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { FilterBar } from '@/components/admin/FilterBar'
import { ExportButton } from '@/components/admin/ExportButton'
import { format } from 'date-fns'

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
  const [filteredExams, setFilteredExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortBy, setSortBy] = useState<'created_at' | 'title' | 'scheduled_start'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')

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
        setFilteredExams(data || [])
      }
      setLoading(false)
    }

    fetchExams()
  }, [])

  useEffect(() => {
    let filtered = [...exams]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (exam) =>
          exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          exam.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter((exam) => exam.status === statusFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'scheduled_start':
          aValue = a.scheduled_start ? new Date(a.scheduled_start).getTime() : 0
          bValue = b.scheduled_start ? new Date(b.scheduled_start).getTime() : 0
          break
        default:
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    setFilteredExams(filtered)
  }, [exams, searchTerm, statusFilter, sortBy, sortOrder])

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedExams.size === 0) {
      alert('Please select at least one exam')
      return
    }

    if (action === 'delete' && !confirm(`Are you sure you want to delete ${selectedExams.size} exam(s)?`)) {
      return
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      alert('Please log in to perform bulk actions')
      return
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    if (role !== 'admin') {
      alert('Unauthorized: Only admins can perform bulk actions')
      return
    }

    try {
      if (action === 'delete') {
        const { error } = await supabase
          .from('exams')
          .delete()
          .in('id', Array.from(selectedExams))

        if (error) throw error
      } else {
        const newStatus = action === 'activate' ? 'active' : 'draft'
        const { error } = await supabase
          .from('exams')
          .update({ status: newStatus })
          .in('id', Array.from(selectedExams))

        if (error) throw error
      }

      // Refresh exams
      const { data: updatedData } = await supabase
        .from('exams')
        .select('*')
        .order('created_at', { ascending: false })

      setExams(updatedData || [])
      setSelectedExams(new Set())
      alert(`Successfully ${action === 'delete' ? 'deleted' : action === 'activate' ? 'activated' : 'deactivated'} ${selectedExams.size} exam(s)`)
    } catch (error: any) {
      alert(`Error: ${error.message}`)
    }
  }

  const toggleExamSelection = (examId: string) => {
    const newSelected = new Set(selectedExams)
    if (newSelected.has(examId)) {
      newSelected.delete(examId)
    } else {
      newSelected.add(examId)
    }
    setSelectedExams(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedExams.size === filteredExams.length) {
      setSelectedExams(new Set())
    } else {
      setSelectedExams(new Set(filteredExams.map((e) => e.id)))
    }
  }

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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0 border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-[#C0392B] text-white'
                  : 'text-gray-600 hover:bg-gray-100 bg-white'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                viewMode === 'calendar'
                  ? 'bg-[#C0392B] text-white'
                  : 'text-gray-600 hover:bg-gray-100 bg-white'
              }`}
            >
              Calendar
            </button>
          </div>
          <ExportButton
            data={filteredExams.map((exam) => ({
              Title: exam.title,
              Status: exam.status,
              Duration: `${exam.duration_minutes} minutes`,
              Questions: exam.total_questions,
              'Scheduled Start': exam.scheduled_start ? format(new Date(exam.scheduled_start), 'yyyy-MM-dd HH:mm') : 'Not scheduled',
              'Scheduled End': exam.scheduled_end ? format(new Date(exam.scheduled_end), 'yyyy-MM-dd HH:mm') : 'Not scheduled',
              'Created At': format(new Date(exam.created_at), 'yyyy-MM-dd HH:mm'),
            }))}
            filename="exams"
            exportType="both"
            pdfTitle="Exams List"
            columns={[
              { header: 'Title', dataKey: 'Title' },
              { header: 'Status', dataKey: 'Status' },
              { header: 'Duration', dataKey: 'Duration' },
              { header: 'Questions', dataKey: 'Questions' },
              { header: 'Scheduled Start', dataKey: 'Scheduled Start' },
              { header: 'Scheduled End', dataKey: 'Scheduled End' },
            ]}
          />
          <Link href="/admin/exams/new">
            <Button variant="primary">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Exam
            </Button>
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search exams by title or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C0392B] focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <FilterBar
          filters={{
            status: {
              label: 'Status',
              options: [
                { value: 'draft', label: 'Draft' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
              ],
              value: statusFilter,
              onChange: setStatusFilter,
            },
            sort: {
              label: 'Sort By',
              options: [
                { value: 'created_at', label: 'Date Created' },
                { value: 'title', label: 'Title' },
                { value: 'scheduled_start', label: 'Scheduled Start' },
              ],
              value: sortBy,
              onChange: (value) => setSortBy(value as typeof sortBy),
            },
            order: {
              label: 'Order',
              options: [
                { value: 'desc', label: 'Descending' },
                { value: 'asc', label: 'Ascending' },
              ],
              value: sortOrder,
              onChange: (value) => setSortOrder(value as typeof sortOrder),
            },
          }}
          onReset={() => {
            setSearchTerm('')
            setStatusFilter('')
            setSortBy('created_at')
            setSortOrder('desc')
          }}
        />

        {/* Bulk Actions */}
        {selectedExams.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900">
              {selectedExams.size} exam(s) selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('activate')}
              >
                Activate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('deactivate')}
              >
                Deactivate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('delete')}
              >
                Delete
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedExams(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6">
          <p className="text-gray-500 text-center py-8">
            Calendar view will be available in the Schedule page. <Link href="/admin/exams/schedule" className="text-[#C0392B] hover:underline">Go to Schedule</Link>
          </p>
        </div>
      ) : null}

      {viewMode === 'list' && (
        <>
          {filteredExams.length === 0 ? (
            <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {exams.length === 0 ? 'No exams yet' : 'No exams match your filters'}
              </h3>
              <p className="text-gray-500 mb-6">
                {exams.length === 0
                  ? 'Create your first exam to get started'
                  : 'Try adjusting your search or filters'}
              </p>
              {exams.length === 0 && (
                <Link href="/admin/exams/new">
                  <Button variant="primary">Create Exam</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredExams.map((exam) => (
                <div
                  key={exam.id}
                  className={`bg-white/70 backdrop-blur-xl rounded-2xl border ${
                    selectedExams.has(exam.id)
                      ? 'border-[#C0392B] shadow-lg'
                      : 'border-white/20 shadow-lg'
                  } p-6 hover:shadow-xl transition-all`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedExams.has(exam.id)}
                      onChange={() => toggleExamSelection(exam.id)}
                      className="mt-1 w-4 h-4 text-[#C0392B] border-gray-300 rounded focus:ring-[#C0392B]"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Link
                      href={`/admin/exams/${exam.id}`}
                      className="flex-1"
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

