'use client'

import { useState } from 'react'

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general')

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-1">Manage your admin preferences and application settings.</p>
                </div>

                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'general'
                                ? 'border-[#C0392B] text-[#C0392B]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        General
                    </button>
                    <button
                        onClick={() => setActiveTab('account')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'account'
                                ? 'border-[#C0392B] text-[#C0392B]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Account
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'security'
                                ? 'border-[#C0392B] text-[#C0392B]'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        Security
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-4 p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <p className="text-sm">Global application settings are currently managed via environment variables.</p>
                            </div>

                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Appearance</h3>
                                <p className="text-sm text-gray-500 mb-4">Customize the admin panel look and feel.</p>
                                <div className="grid grid-cols-2 gap-4 max-w-md">
                                    <div className="border border-[#C0392B] ring-2 ring-[#C0392B]/20 rounded-lg p-3 cursor-pointer">
                                        <div className="h-20 bg-gray-100 rounded mb-2"></div>
                                        <p className="text-center text-sm font-medium text-[#C0392B]">Light Mode</p>
                                    </div>
                                    <div className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-gray-300 opacity-50">
                                        <div className="h-20 bg-gray-800 rounded mb-2"></div>
                                        <p className="text-center text-sm font-medium text-gray-500">Dark Mode (Coming Soon)</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
                                <p className="text-sm text-gray-500 mb-4">Update your account details.</p>
                                <div className="max-w-md space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                        <input
                                            type="text"
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                            value="Admin User"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Managed via Profile page</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            disabled
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                                            value="admin@example.com"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900">Password</h3>
                                <p className="text-sm text-gray-500 mb-4">Manage your password.</p>
                                <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">
                                    Change Password
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
