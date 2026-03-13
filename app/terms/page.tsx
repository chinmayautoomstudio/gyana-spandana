'use client'

import Link from 'next/link'

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50 to-red-50">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-[#C0392B] via-[#E67E22] to-[#F39C12] text-white py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-lg">Terms and Conditions</h1>
                    <p className="text-xl text-white drop-shadow-md max-w-3xl">
                        Please read these terms and conditions carefully before participating in <span className="font-semibold drop-shadow-lg">GYANA SPARDHA</span>.
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
                                Welcome to GYANA SPARDHA ("the Competition"). By registering for and participating in this quiz competition,
                                you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms,
                                please do not register or participate in the Competition.
                            </p>
                            <p className="text-gray-700">
                                GYANA SPARDHA is organized to celebrate and promote knowledge about Odisha's rich cultural heritage,
                                history, geography, literature, and traditions.
                            </p>
                        </section>

                        {/* Eligibility */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Eligibility</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Participants must be students or individuals with a genuine interest in Odisha's culture and heritage.</li>
                                <li>Each team must consist of exactly two (2) participants.</li>
                                <li>Participants must provide accurate and truthful information during registration.</li>
                                <li>Each participant can only be part of one team.</li>
                                <li>Participants must have a valid email address for communication and verification.</li>
                                <li>Organizers reserve the right to verify eligibility and disqualify participants who provide false information.</li>
                            </ul>
                        </section>

                        {/* Registration */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Registration</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Registration is free of charge and must be completed through the official GYANA SPARDHA website.</li>
                                <li>Both team members must complete their individual profiles with accurate information.</li>
                                <li>Each team will receive a unique Team ID upon successful registration.</li>
                                <li>Registration details cannot be changed after submission without prior approval from organizers.</li>
                                <li>Team member changes are generally not permitted after registration closes.</li>
                                <li>Organizers reserve the right to close registration at any time without prior notice.</li>
                            </ul>
                        </section>

                        {/* Competition Format */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Competition Format</h2>
                            <div className="space-y-4 text-gray-700">
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">4.1 Screening Round</h3>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>All registered teams must participate in an online screening test.</li>
                                        <li>The screening test can be taken from any location with internet access.</li>
                                        <li>Questions will be in Odia language covering various topics about Odisha.</li>
                                        <li>Time limits will be strictly enforced.</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-2">4.2 Oral Round</h3>
                                    <ul className="list-disc pl-6 space-y-2">
                                        <li>Top 64 teams from the screening round will qualify for the oral test.</li>
                                        <li>Oral test schedule and format will be communicated to qualified teams.</li>
                                        <li>Attendance is mandatory for both team members during the oral round.</li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* Rules and Conduct */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Rules and Conduct</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Participants must not engage in any form of cheating, plagiarism, or unfair practices.</li>
                                <li>Use of unauthorized assistance, external resources, or communication during the test is strictly prohibited.</li>
                                <li>Each participant must complete their portion of the quiz independently.</li>
                                <li>Any attempt to manipulate scores, hack the system, or disrupt the competition will result in immediate disqualification.</li>
                                <li>Participants must maintain respectful and professional conduct at all times.</li>
                                <li>Organizers' decisions regarding rule violations are final and binding.</li>
                            </ul>
                        </section>

                        {/* Scoring and Results */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Scoring and Results</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Team scores are calculated based on the combined performance of both team members.</li>
                                <li>Scoring criteria include correctness of answers and time taken to complete the quiz.</li>
                                <li>In case of tied scores, organizers will use predetermined tie-breaking criteria.</li>
                                <li>Results will be published on the official leaderboard and website.</li>
                                <li>Score disputes must be raised within 48 hours of result publication.</li>
                                <li>Organizers reserve the right to review and adjust scores if irregularities are detected.</li>
                            </ul>
                        </section>

                        {/* Prizes and Recognition */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Prizes and Recognition</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>All participants will receive digital certificates of participation.</li>
                                <li>Top-performing teams will receive special recognition and prizes as announced by organizers.</li>
                                <li>Prize distribution will take place on April 30, 2026, or as announced.</li>
                                <li>Winners must be present (or represented by at least one team member) during prize distribution.</li>
                                <li>Prizes are non-transferable and cannot be exchanged for cash.</li>
                                <li>Organizers reserve the right to modify prize details without prior notice.</li>
                            </ul>
                        </section>

                        {/* Intellectual Property */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Intellectual Property</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>All quiz questions, content, and materials are the intellectual property of GYANA SPARDHA organizers.</li>
                                <li>Participants may not reproduce, distribute, or share quiz content without explicit permission.</li>
                                <li>Screenshots, recordings, or any form of content capture during the quiz is strictly prohibited.</li>
                                <li>The GYANA SPARDHA name, logo, and branding are protected trademarks.</li>
                            </ul>
                        </section>

                        {/* Privacy and Data Usage */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Privacy and Data Usage</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Participant information will be collected and used in accordance with our Privacy Policy.</li>
                                <li>By registering, participants consent to the collection and use of their personal information.</li>
                                <li>Participant names and scores may be published on public leaderboards and promotional materials.</li>
                                <li>Organizers will not share personal contact information with third parties without consent.</li>
                            </ul>
                        </section>

                        {/* Technical Requirements */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Technical Requirements</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Participants are responsible for ensuring they have stable internet connectivity.</li>
                                <li>Recommended browsers: Latest versions of Chrome, Firefox, Safari, or Edge.</li>
                                <li>Technical issues must be reported immediately to organizers.</li>
                                <li>Organizers are not responsible for technical failures on the participant's end.</li>
                                <li>In case of platform-wide technical issues, organizers may reschedule or extend the competition.</li>
                            </ul>
                        </section>

                        {/* Liability and Disclaimers */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Liability and Disclaimers</h2>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700">
                                <li>Participation in GYANA SPARDHA is at the participant's own risk.</li>
                                <li>Organizers are not liable for any direct or indirect damages arising from participation.</li>
                                <li>Organizers are not responsible for lost opportunities, technical failures, or connectivity issues.</li>
                                <li>The competition is provided "as is" without warranties of any kind.</li>
                                <li>Organizers reserve the right to cancel, postpone, or modify the competition at any time.</li>
                            </ul>
                        </section>

                        {/* Modifications to Terms */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">12. Modifications to Terms</h2>
                            <p className="text-gray-700 mb-4">
                                Organizers reserve the right to modify these Terms and Conditions at any time. Participants will be
                                notified of significant changes via email or website announcements. Continued participation after
                                modifications constitutes acceptance of the updated terms.
                            </p>
                        </section>

                        {/* Governing Law */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">13. Governing Law</h2>
                            <p className="text-gray-700 mb-4">
                                These Terms and Conditions are governed by the laws of India. Any disputes arising from the competition
                                will be subject to the exclusive jurisdiction of courts in Odisha, India.
                            </p>
                        </section>

                        {/* Contact Information */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">14. Contact Information</h2>
                            <p className="text-gray-700 mb-4">
                                For questions or concerns regarding these Terms and Conditions, please contact us at:
                            </p>
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <p className="text-gray-900 font-semibold">Email:</p>
                                <a href="mailto:gyanaspardha@gmail.com" className="text-[#E67E22] hover:text-[#C0392B] transition-colors">
                                    gyanaspardha@gmail.com
                                </a>
                            </div>
                        </section>

                        {/* Acceptance */}
                        <section className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">15. Acceptance of Terms</h2>
                            <p className="text-gray-700">
                                By clicking "I Agree" during registration or by participating in GYANA SPARDHA, you acknowledge that
                                you have read, understood, and agree to be bound by these Terms and Conditions.
                            </p>
                        </section>
                    </div>

                    {/* Back to Home */}
                    <div className="mt-12 pt-8 border-t border-gray-200">
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2 text-[#E67E22] hover:text-[#C0392B] font-semibold transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
