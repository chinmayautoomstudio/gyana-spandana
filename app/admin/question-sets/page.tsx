'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { QuestionSetForm } from '@/components/admin/QuestionSetForm'
import { format } from 'date-fns'

interface QuestionSet {
  id: string
  name: string
  description: string | null
  total_questions: number
  created_at: string
  updated_at: string
}

export default function QuestionSetsPage() {
  const [questionSets, setQuestionSets] = useState<QuestionSet[]>([])
  const [filteredSets, setFilteredSets] = useState<QuestionSet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingSet, setEditingSet] = useState<QuestionSet | null>(null)
  const [deletingSetId, setDeletingSetId] = useState<string | null>(null)

  useEffect(() => {
    fetchQuestionSets()
  }, [])

  useEffect(() => {
    filterSets()
  }, [questionSets, searchTerm])

  const fetchQuestionSets = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/question-sets')
      if (response.ok) {
        const { questionSets } = await response.json()
        setQuestionSets(questionSets || [])
      }
    } catch (error) {
      console.error('Error fetching question sets:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterSets = () => {
    let filtered = [...questionSets]

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (set) =>
          set.name.toLowerCase().includes(lowerSearch) ||
          set.description?.toLowerCase().includes(lowerSearch)
      )
    }

    setFilteredSets(filtered)
  }

  const handleCreate = () => {
    setEditingSet(null)
    setShowForm(true)
  }

  const handleEdit = (set: QuestionSet) => {
    setEditingSet(set)
    setShowForm(true)
  }

  const handleDelete = async (setId: string) => {
    if (!confirm('Are you sure you want to delete this question set? This action cannot be undone.')) {
      return
    }

    setDeletingSetId(setId)
    try {
      const response = await fetch(`/api/admin/question-sets/${setId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchQuestionSets()
      } else {
        const { error } = await response.json()
        alert(`Error: ${error || 'Failed to delete question set'}`)
      }
    } catch (error: any) {
      alert(`Error: ${error.message || 'Failed to delete question set'}`)
    } finally {
      setDeletingSetId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM dd, yyyy')
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Question Paper Sets</h1>
          <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">
            Create and manage reusable question sets for exams
          </p>
        </div>
        <Button variant="primary" size="md" onClick={handleCreate}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create New Set
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search question sets by name or description..."
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

      {/* Table View */}
      {filteredSets.length === 0 ? (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {questionSets.length === 0 ? 'No Question Sets Yet' : 'No Sets Match Your Search'}
          </h3>
          <p className="text-gray-500 mb-4">
            {questionSets.length === 0
              ? 'Create your first question set to organize questions for exams'
              : 'Try adjusting your search terms'}
          </p>
          {questionSets.length === 0 && (
            <Button variant="primary" size="md" onClick={handleCreate}>
              Create Question Set
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Questions
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSets.map((set) => (
                  <tr key={set.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/question-sets/${set.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-[#C0392B]"
                      >
                        {set.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500 max-w-md truncate" title={set.description || ''}>
                        {set.description || 'No description'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        {set.total_questions} {set.total_questions === 1 ? 'question' : 'questions'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(set.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(set)}
                          className="text-[#C0392B] hover:text-[#A93226] p-1"
                          title="Edit"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(set.id)}
                          disabled={deletingSetId === set.id}
                          className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                          title="Delete"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {filteredSets.map((set) => (
              <div key={set.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <Link
                    href={`/admin/question-sets/${set.id}`}
                    className="text-base font-medium text-gray-900 hover:text-[#C0392B] flex-1"
                  >
                    {set.name}
                  </Link>
                  <div className="flex items-center gap-2 ml-2">
                    <button
                      onClick={() => handleEdit(set)}
                      className="text-[#C0392B] hover:text-[#A93226] p-1"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(set.id)}
                      disabled={deletingSetId === set.id}
                      className="text-red-600 hover:text-red-800 p-1 disabled:opacity-50"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                {set.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{set.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    {set.total_questions} {set.total_questions === 1 ? 'question' : 'questions'}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(set.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Set Form Modal */}
      <QuestionSetForm
        questionSet={editingSet}
        isOpen={showForm}
        onClose={() => {
          setShowForm(false)
          setEditingSet(null)
        }}
        onSuccess={fetchQuestionSets}
      />
    </div>
  )
}

