'use client'

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-red-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#C0392B] via-[#E67E22] to-[#F39C12] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">Privacy Policy</h1>
                    <p className="text-xl text-white drop-shadow-md max-w-3xl">
                        Your privacy is important to us. Learn how we collect, use, and protect your personal information.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 border border-orange-100">
                    <p className="text-gray-600 mb-8">
                        <strong>Last Updated:</strong> February 10, 2026
                    </p>

                    <div className="prose prose-lg max-w-none">
                        {/* Introduction */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introduction</h2>
                            <p className="text-gray-700 mb-4">
                                Welcome to GYANA SPARDHA's Privacy Policy. We are committed to protecting your personal information
                                and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard
                                your information when you register for and participate in our quiz competition.
                            </p>
                            <p className="text-gray-700">
                                Please read this Privacy Policy carefully. By using our platform and participating in GYANA SPARDHA,
                                you agree to the collection and use of information in accordance with this policy.
                            </p>
                        </section>

                        {/* Information We Collect */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Information We Collect</h2>

                            <div className="space-y-4 text-gray-700">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">2.1 Personal Information</h3>
                                    <p className="mb-2">We collect personal information that you voluntarily provide to us when you register for the competition, including:</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>Full name</li>
                                        <li>Email address</li>
                                        <li>Phone number (if provided)</li>
                                        <li>Educational institution or affiliation</li>
                                        <li>Team member information</li>
                                        <li>Profile picture (if uploaded)</li>
                                        <li>Any other information you choose to provide</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">2.2 Automatically Collected Information</h3>
                                    <p className="mb-2">When you access our platform, we automatically collect certain information, including:</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>IP address and device information</li>
                                        <li>Browser type and version</li>
                                        <li>Operating system</li>
                                        <li>Access times and dates</li>
                                        <li>Pages viewed and navigation patterns</li>
                                        <li>Referring website addresses</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">2.3 Competition Data</h3>
                                    <p className="mb-2">During your participation in the competition, we collect:</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>Quiz responses and answers</li>
                                        <li>Scores and performance metrics</li>
                                        <li>Time taken to complete quizzes</li>
                                        <li>Login and activity timestamps</li>
                                        <li>Team performance data</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* How We Use Your Information */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. How We Use Your Information</h2>
                            <p className="text-gray-700 mb-4">We use the collected information for the following purposes:</p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li><strong>Competition Administration:</strong> To manage registrations, verify eligibility, and administer the quiz competition</li>
                                <li><strong>Communication:</strong> To send you important updates, notifications, and information about the competition</li>
                                <li><strong>Scoring and Rankings:</strong> To calculate scores, maintain leaderboards, and determine winners</li>
                                <li><strong>Certificates and Prizes:</strong> To generate certificates and distribute prizes to winners</li>
                                <li><strong>Platform Improvement:</strong> To analyze usage patterns and improve our platform's functionality</li>
                                <li><strong>Security:</strong> To detect and prevent fraud, cheating, and unauthorized access</li>
                                <li><strong>Legal Compliance:</strong> To comply with legal obligations and protect our rights</li>
                                <li><strong>Marketing:</strong> To send promotional materials about future competitions (with your consent)</li>
                            </ul>
                        </section>

                        {/* Information Sharing */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Information Sharing and Disclosure</h2>

                            <div className="space-y-4 text-gray-700">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">4.1 Public Information</h3>
                                    <p className="mb-2">The following information may be made publicly available:</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>Participant names on leaderboards</li>
                                        <li>Team names and rankings</li>
                                        <li>Scores and performance metrics</li>
                                        <li>Winner announcements and recognition</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">4.2 Third-Party Service Providers</h3>
                                    <p className="mb-2">We may share your information with trusted third-party service providers who assist us in:</p>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>Hosting and maintaining our platform</li>
                                        <li>Email communication services</li>
                                        <li>Analytics and performance monitoring</li>
                                        <li>Payment processing (if applicable)</li>
                                    </ul>
                                    <p className="mt-2">These service providers are contractually obligated to protect your information and use it only for the purposes we specify.</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">4.3 Legal Requirements</h3>
                                    <p>We may disclose your information if required by law, court order, or governmental authority, or to protect our rights, property, or safety.</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">4.4 What We Don't Share</h3>
                                    <p>We will never sell, rent, or trade your personal contact information to third parties for marketing purposes without your explicit consent.</p>
                                </div>
                            </div>
                        </section>

                        {/* Data Security */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security</h2>
                            <p className="text-gray-700 mb-4">
                                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Encryption of data in transit using SSL/TLS protocols</li>
                                <li>Secure password hashing and authentication</li>
                                <li>Regular security audits and updates</li>
                                <li>Access controls and authentication mechanisms</li>
                                <li>Secure database storage with backup systems</li>
                            </ul>
                            <p className="text-gray-700 mt-4">
                                However, please note that no method of transmission over the internet or electronic storage is 100% secure.
                                While we strive to protect your personal information, we cannot guarantee absolute security.
                            </p>
                        </section>

                        {/* Cookies and Tracking */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies and Tracking Technologies</h2>
                            <p className="text-gray-700 mb-4">
                                We use cookies and similar tracking technologies to enhance your experience on our platform:
                            </p>

                            <div className="space-y-4 text-gray-700">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">6.1 Essential Cookies</h3>
                                    <p>These cookies are necessary for the platform to function properly, including authentication and security features.</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">6.2 Analytics Cookies</h3>
                                    <p>We use analytics cookies to understand how users interact with our platform and improve user experience.</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">6.3 Managing Cookies</h3>
                                    <p>You can control cookie settings through your browser preferences. However, disabling certain cookies may affect platform functionality.</p>
                                </div>
                            </div>
                        </section>

                        {/* Data Retention */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Data Retention</h2>
                            <p className="text-gray-700 mb-4">
                                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required by law. Specifically:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Registration and profile information: Retained for the duration of the competition and up to 2 years after completion</li>
                                <li>Competition scores and results: Retained indefinitely for historical records and leaderboards</li>
                                <li>Communication records: Retained for up to 1 year after the competition</li>
                                <li>Analytics data: Aggregated and anonymized data may be retained indefinitely</li>
                            </ul>
                        </section>

                        {/* Your Rights */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Your Privacy Rights</h2>
                            <p className="text-gray-700 mb-4">You have the following rights regarding your personal information:</p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li><strong>Access:</strong> You can request access to the personal information we hold about you</li>
                                <li><strong>Correction:</strong> You can request correction of inaccurate or incomplete information</li>
                                <li><strong>Deletion:</strong> You can request deletion of your personal information (subject to legal requirements)</li>
                                <li><strong>Opt-out:</strong> You can opt-out of marketing communications at any time</li>
                                <li><strong>Data Portability:</strong> You can request a copy of your data in a structured, machine-readable format</li>
                                <li><strong>Withdraw Consent:</strong> You can withdraw consent for data processing where consent was the legal basis</li>
                            </ul>
                            <p className="text-gray-700 mt-4">
                                To exercise these rights, please contact us at <a href="mailto:gyanaspardha@gmail.com" className="text-[#E67E22] hover:text-[#C0392B] transition-colors">gyanaspardha@gmail.com</a>
                            </p>
                        </section>

                        {/* Children's Privacy */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Children's Privacy</h2>
                            <p className="text-gray-700 mb-4">
                                Our competition is open to students and individuals of various ages. If you are under 18 years of age,
                                you should obtain parental or guardian consent before providing any personal information. Parents and
                                guardians can contact us to review, modify, or delete their child's information.
                            </p>
                        </section>

                        {/* Third-Party Links */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Third-Party Links</h2>
                            <p className="text-gray-700 mb-4">
                                Our platform may contain links to third-party websites or services. We are not responsible for the
                                privacy practices of these third parties. We encourage you to review their privacy policies before
                                providing any personal information.
                            </p>
                        </section>

                        {/* International Data Transfers */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. International Data Transfers</h2>
                            <p className="text-gray-700 mb-4">
                                Your information may be transferred to and processed in countries other than your country of residence.
                                These countries may have different data protection laws. By using our platform, you consent to such transfers.
                            </p>
                        </section>

                        {/* Changes to Privacy Policy */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Changes to This Privacy Policy</h2>
                            <p className="text-gray-700 mb-4">
                                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements.
                                We will notify you of significant changes by posting the updated policy on our website and updating the
                                "Last Updated" date. Your continued use of the platform after such changes constitutes acceptance of the
                                updated Privacy Policy.
                            </p>
                        </section>

                        {/* Contact Information */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Contact Us</h2>
                            <p className="text-gray-700 mb-4">
                                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices,
                                please contact us at:
                            </p>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 space-y-3">
                                <div>
                                    <p className="text-gray-900 font-semibold">Email:</p>
                                    <a href="mailto:gyanaspardha@gmail.com" className="text-[#E67E22] hover:text-[#C0392B] transition-colors text-lg">
                                        gyanaspardha@gmail.com
                                    </a>
                                </div>
                                <div>
                                    <p className="text-gray-900 font-semibold">Subject Line:</p>
                                    <p className="text-gray-700">Privacy Inquiry - GYANA SPARDHA</p>
                                </div>
                                <div>
                                    <p className="text-gray-700 text-sm mt-4">
                                        We will respond to your inquiry within 7 business days.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Consent */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Your Consent</h2>
                            <p className="text-gray-700">
                                By using our platform and participating in GYANA SPARDHA, you acknowledge that you have read and
                                understood this Privacy Policy and consent to the collection, use, and disclosure of your personal
                                information as described herein.
                            </p>
                        </section>
                    </div>

                    {/* Back to Home */}
                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <a
                            href="/"
                            className="inline-flex items-center gap-2 text-[#E67E22] hover:text-[#C0392B] font-semibold transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Home
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
