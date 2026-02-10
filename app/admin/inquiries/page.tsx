'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ContactInquiry {
    id: string
    name: string
    email: string
    subject: string
    message: string
    status: 'new' | 'in_progress' | 'resolved' | 'closed'
    admin_notes: string | null
    created_at: string
    updated_at: string
    resolved_at: string | null
}

export default function InquiriesPage() {
    const [inquiries, setInquiries] = useState<ContactInquiry[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<string>('all')
    const [selectedInquiry, setSelectedInquiry] = useState<ContactInquiry | null>(null)
    const [isAdmin, setIsAdmin] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        checkAdminAndFetchInquiries()
    }, [filter])

    async function checkAdminAndFetchInquiries() {
        try {
            // Check if user is admin
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('user_id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                router.push('/dashboard')
                return
            }

            setIsAdmin(true)
            await fetchInquiries()
        } catch (error) {
            console.error('Error checking admin status:', error)
            router.push('/dashboard')
        }
    }

    async function fetchInquiries() {
        try {
            setLoading(true)
            let query = supabase
                .from('contact_inquiries')
                .select('*')
                .order('created_at', { ascending: false })

            if (filter !== 'all') {
                query = query.eq('status', filter)
            }

            const { data, error } = await query

            if (error) throw error
            setInquiries(data || [])
        } catch (error) {
            console.error('Error fetching inquiries:', error)
        } finally {
            setLoading(false)
        }
    }

    async function updateStatus(id: string, newStatus: string) {
        try {
            const updates: any = { status: newStatus }

            if (newStatus === 'resolved' || newStatus === 'closed') {
                updates.resolved_at = new Date().toISOString()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) updates.resolved_by = user.id
            }

            const { error } = await supabase
                .from('contact_inquiries')
                .update(updates)
                .eq('id', id)

            if (error) throw error

            await fetchInquiries()
            if (selectedInquiry?.id === id) {
                setSelectedInquiry({ ...selectedInquiry, status: newStatus as any })
            }
        } catch (error) {
            console.error('Error updating status:', error)
            alert('Failed to update status')
        }
    }

    async function updateNotes(id: string, notes: string) {
        try {
            const { error } = await supabase
                .from('contact_inquiries')
                .update({ admin_notes: notes })
                .eq('id', id)

            if (error) throw error

            await fetchInquiries()
            if (selectedInquiry?.id === id) {
                setSelectedInquiry({ ...selectedInquiry, admin_notes: notes })
            }
        } catch (error) {
            console.error('Error updating notes:', error)
            alert('Failed to update notes')
        }
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Checking permissions...</p>
                </div>
            </div>
        )
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new': return 'bg-blue-100 text-blue-800'
            case 'in_progress': return 'bg-yellow-100 text-yellow-800'
            case 'resolved': return 'bg-green-100 text-green-800'
            case 'closed': return 'bg-gray-100 text-gray-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-red-50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Inquiries</h1>
                    <p className="text-gray-600">Manage and respond to contact form submissions</p>
                </div>

                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'new', 'in_progress', 'resolved', 'closed'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === status
                                        ? 'bg-gradient-to-r from-[#C0392B] to-[#E67E22] text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {status === 'all' ? 'All' : status.replace('_', ' ').toUpperCase()}
                                {status !== 'all' && (
                                    <span className="ml-2 text-sm">
                                        ({inquiries.filter(i => i.status === status).length})
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <p className="text-gray-600">Loading inquiries...</p>
                    </div>
                ) : inquiries.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                        <p className="text-gray-600">No inquiries found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Inquiries List */}
                        <div className="space-y-4">
                            {inquiries.map((inquiry) => (
                                <div
                                    key={inquiry.id}
                                    onClick={() => setSelectedInquiry(inquiry)}
                                    className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer transition-all hover:shadow-md ${selectedInquiry?.id === inquiry.id ? 'ring-2 ring-[#E67E22]' : ''
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-1">{inquiry.name}</h3>
                                            <p className="text-sm text-gray-600">{inquiry.email}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                                            {inquiry.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="font-medium text-gray-800 mb-2">{inquiry.subject}</p>
                                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{inquiry.message}</p>
                                    <p className="text-xs text-gray-500">{formatDate(inquiry.created_at)}</p>
                                </div>
                            ))}
                        </div>

                        {/* Inquiry Details */}
                        <div className="lg:sticky lg:top-8 h-fit">
                            {selectedInquiry ? (
                                <div className="bg-white rounded-lg shadow-lg p-6">
                                    <div className="mb-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div>
                                                <h2 className="text-2xl font-bold text-gray-900 mb-1">{selectedInquiry.name}</h2>
                                                <a href={`mailto:${selectedInquiry.email}`} className="text-[#E67E22] hover:underline">
                                                    {selectedInquiry.email}
                                                </a>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedInquiry.status)}`}>
                                                {selectedInquiry.status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600 mb-1">Subject</p>
                                            <p className="font-semibold text-gray-900">{selectedInquiry.subject}</p>
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-sm text-gray-600 mb-1">Message</p>
                                            <p className="text-gray-800 whitespace-pre-wrap">{selectedInquiry.message}</p>
                                        </div>

                                        <div className="text-sm text-gray-500">
                                            <p>Submitted: {formatDate(selectedInquiry.created_at)}</p>
                                            {selectedInquiry.resolved_at && (
                                                <p>Resolved: {formatDate(selectedInquiry.resolved_at)}</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Update */}
                                    <div className="mb-6">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Update Status
                                        </label>
                                        <select
                                            value={selectedInquiry.status}
                                            onChange={(e) => updateStatus(selectedInquiry.id, e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent"
                                        >
                                            <option value="new">New</option>
                                            <option value="in_progress">In Progress</option>
                                            <option value="resolved">Resolved</option>
                                            <option value="closed">Closed</option>
                                        </select>
                                    </div>

                                    {/* Admin Notes */}
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Admin Notes
                                        </label>
                                        <textarea
                                            value={selectedInquiry.admin_notes || ''}
                                            onChange={(e) => {
                                                setSelectedInquiry({ ...selectedInquiry, admin_notes: e.target.value })
                                            }}
                                            onBlur={(e) => updateNotes(selectedInquiry.id, e.target.value)}
                                            rows={4}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent resize-none"
                                            placeholder="Add internal notes about this inquiry..."
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                                    <p className="text-gray-600">Select an inquiry to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
