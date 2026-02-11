'use client'

import React from 'react'
import { Button } from '@/components/ui/Button'

interface SubmitExamModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    isSubmitting: boolean
    brief?: {
        answered: number
        total: number
    }
}

export const SubmitExamModal: React.FC<SubmitExamModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    isSubmitting,
    brief
}) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden transform transition-all">
                {isSubmitting ? (
                    <div className="p-8 text-center">
                        <div className="w-16 h-16 border-4 border-[#C0392B] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Submitting Exam...</h3>
                        <p className="text-gray-500">Please wait while we save your answers.</p>
                        <p className="text-sm text-red-500 mt-2 font-medium">Do not close this window.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-6">
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 text-[#C0392B]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Submit Exam?</h3>
                            <p className="text-gray-600 mb-4">
                                Are you sure you want to submit? You won't be able to change your answers after submission.
                            </p>

                            {brief && (
                                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-100">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-gray-600">Answered Questions:</span>
                                        <span className="font-semibold text-gray-900">{brief.answered} / {brief.total}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                                        <div
                                            className="bg-[#C0392B] h-2 rounded-full transition-all"
                                            style={{ width: `${(brief.answered / brief.total) * 100}%` }}
                                        ></div>
                                    </div>
                                    {brief.answered < brief.total && (
                                        <p className="text-xs text-amber-600 mt-2 font-medium">
                                            You have {brief.total - brief.answered} unanswered questions.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end">
                            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                onClick={onConfirm}
                                disabled={isSubmitting}
                                className="bg-[#C0392B] hover:bg-[#A93226]"
                            >
                                Confirm Submit
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
