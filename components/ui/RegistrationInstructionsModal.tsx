'use client'

import { Button } from './Button'

interface RegistrationInstructionsModalProps {
    isOpen: boolean
    onClose: () => void
}

export function RegistrationInstructionsModal({ isOpen, onClose }: RegistrationInstructionsModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <svg className="w-6 h-6 text-[#C0392B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Registration Instructions
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                        aria-label="Close"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-4 text-sm text-gray-600">
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">1</div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Form a Team</h3>
                                <p>You must register as a team of <strong>2 members</strong>. Individual registration is not allowed.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">2</div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Prepare Information</h3>
                                <p>Keep the following details ready for <strong>both</strong> participants:</p>
                                <ul className="list-disc pl-4 mt-1 space-y-1 text-xs">
                                    <li>Full Name</li>
                                    <li>Email Address & Phone Number</li>
                                    <li>Aadhar Number</li>
                                    <li>Class / Grade</li>
                                </ul>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">3</div>
                            <div>
                                <h3 className="font-semibold text-gray-900">School Authority Details</h3>
                                <p>You need the Name, Email, and Phone Number of your School/College Authority (e.g., Principal or Coordinator).</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">4</div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Verification</h3>
                                <p>Working Email IDs and Phone Numbers are mandatory. You will receive OTPs for verification during registration.</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">5</div>
                            <div>
                                <h3 className="font-semibold text-gray-900">Important Note</h3>
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-1">
                                    <p className="text-yellow-800 text-xs">
                                        Online registration requires approval from your educational institution authority. Ensure all details are accurate.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 pt-2 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                    <Button onClick={onClose} className="w-full" size="lg">
                        I Understand, Let's Begin
                    </Button>
                </div>
            </div>
        </div>
    )
}
