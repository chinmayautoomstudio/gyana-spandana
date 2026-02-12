'use client'

import { useState } from 'react'

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
    const [errorMessage, setErrorMessage] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)
        setSubmitStatus('idle')
        setErrorMessage('')

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Failed to submit form')
            }

            setSubmitStatus('success')
            setFormData({ name: '', email: '', subject: '', message: '' })

            // Reset success message after 5 seconds
            setTimeout(() => setSubmitStatus('idle'), 5000)
        } catch (error) {
            console.error('Form submission error:', error)
            setSubmitStatus('error')
            setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }))
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-red-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#C0392B] via-[#E67E22] to-[#F39C12] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">Contact Us</h1>
                    <p className="text-xl text-white drop-shadow-md max-w-3xl">
                        Have questions about <span className="font-semibold drop-shadow-lg">GYANA SPARDHA</span>? We're here to help! Reach out to us and we'll get back to you as soon as possible.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    {/* Contact Information */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                            <p className="text-gray-600 text-lg mb-8">
                                Whether you have questions about registration, the competition format, or technical issues,
                                we're here to assist you. Feel free to reach out through any of the channels below.
                            </p>
                        </div>

                        {/* Contact Cards */}
                        <div className="space-y-6">
                            {/* Email */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-orange-100">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900 mb-1">Email</h3>
                                        <a
                                            href="mailto:gyanaspardha@gmail.com"
                                            className="text-[#E67E22] hover:text-[#C0392B] transition-colors text-lg"
                                        >
                                            gyanaspardha@gmail.com
                                        </a>
                                        <p className="text-gray-600 text-sm mt-2">
                                            We typically respond within 24-48 hours
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Office Hours */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-orange-100">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#E67E22] to-[#F39C12] rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900 mb-1">Support Hours</h3>
                                        <p className="text-gray-700">Monday - Saturday</p>
                                        <p className="text-gray-700">10:00 AM - 6:00 PM IST</p>
                                        <p className="text-gray-600 text-sm mt-2">
                                            Closed on Sundays and public holidays
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Social Media */}
                            <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow border border-orange-100">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#F39C12] to-[#E67E22] rounded-xl flex items-center justify-center flex-shrink-0">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg text-gray-900 mb-2">Follow Us</h3>
                                        <div className="flex gap-3">
                                            <a href="https://www.facebook.com/people/Gyana-Spardha/61588103514633/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                                                </svg>
                                            </a>
                                            <a href="https://www.instagram.com/gyanaspardha/" target="_blank" rel="noopener noreferrer" className="w-10 h-10 bg-gradient-to-br from-[#F39C12] to-[#C0392B] rounded-lg flex items-center justify-center hover:scale-110 transition-transform">
                                                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678c-3.405 0-6.162 2.76-6.162 6.162 0 3.405 2.76 6.162 6.162 6.162 3.405 0 6.162-2.76 6.162-6.162 0-3.405-2.76-6.162-6.162-6.162zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405c0 .795-.646 1.44-1.44 1.44-.795 0-1.44-.646-1.44-1.44 0-.794.646-1.44 1.44-1.44.793-.001 1.44.646 1.44 1.44z" />
                                                </svg>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FAQ Link */}
                        <div className="bg-gradient-to-br from-orange-100 to-red-100 rounded-2xl p-6 border border-orange-200">
                            <h3 className="font-semibold text-lg text-gray-900 mb-2">Quick Answers</h3>
                            <p className="text-gray-700 mb-4">
                                Looking for quick answers? Check out our FAQ section for commonly asked questions.
                            </p>
                            <a
                                href="/#faq"
                                className="inline-flex items-center gap-2 text-[#C0392B] hover:text-[#E67E22] font-semibold transition-colors"
                            >
                                Visit FAQ
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="bg-white rounded-2xl p-8 shadow-xl border border-orange-100">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a Message</h2>

                        {submitStatus === 'success' && (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-800 font-medium">✓ Message sent successfully! We'll get back to you soon.</p>
                            </div>
                        )}

                        {submitStatus === 'error' && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-red-800 font-medium">✗ {errorMessage || 'Failed to send message. Please try again.'}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="Enter your full name"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="your.email@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Subject *
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    required
                                    value={formData.subject}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="What is this regarding?"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                                    Message *
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    required
                                    value={formData.message}
                                    onChange={handleChange}
                                    rows={6}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#E67E22] focus:border-transparent transition-all resize-none text-gray-900 placeholder-gray-400"
                                    placeholder="Tell us more about your inquiry..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full bg-gradient-to-r from-[#C0392B] via-[#E67E22] to-[#F39C12] text-white font-semibold py-4 px-6 rounded-lg hover:shadow-lg transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Sending...' : 'Send Message'}
                            </button>

                            <p className="text-sm text-gray-600 text-center">
                                * Required fields
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
