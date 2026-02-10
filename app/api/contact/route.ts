import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { name, email, subject, message } = body

        // Validation
        if (!name || !email || !subject || !message) {
            return NextResponse.json(
                { error: 'All fields are required' },
                { status: 400 }
            )
        }

        // Trim values for validation
        const trimmedName = name.trim()
        const trimmedEmail = email.trim().toLowerCase()
        const trimmedSubject = subject.trim()
        const trimmedMessage = message.trim()

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(trimmedEmail)) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            )
        }

        // Name validation (2-100 characters)
        if (trimmedName.length < 2 || trimmedName.length > 100) {
            return NextResponse.json(
                { error: 'Name must be between 2 and 100 characters' },
                { status: 400 }
            )
        }

        // Subject validation (3-200 characters)
        if (trimmedSubject.length < 3 || trimmedSubject.length > 200) {
            return NextResponse.json(
                { error: 'Subject must be between 3 and 200 characters' },
                { status: 400 }
            )
        }

        // Message validation (10-2000 characters)
        if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
            return NextResponse.json(
                { error: 'Message must be between 10 and 2000 characters' },
                { status: 400 }
            )
        }

        const supabase = await createClient()

        console.log('Attempting to insert contact inquiry...')
        console.log('Data to insert:', { trimmedName, trimmedEmail, trimmedSubject, trimmedMessage })

        // Insert contact inquiry into database
        const { data, error } = await supabase
            .from('contact_inquiries')
            .insert([
                {
                    name: trimmedName,
                    email: trimmedEmail,
                    subject: trimmedSubject,
                    message: trimmedMessage,
                    status: 'new'
                }
            ])
            .select()
            .single()

        if (error) {
            console.error('❌ Database error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            })
            return NextResponse.json(
                { error: `Failed to submit inquiry: ${error.message}` },
                { status: 500 }
            )
        }

        console.log('✅ Successfully inserted inquiry:', data)

        return NextResponse.json(
            {
                success: true,
                message: 'Your message has been sent successfully! We will get back to you soon.',
                data
            },
            { status: 201 }
        )
    } catch (error) {
        console.error('Contact form error:', error)
        return NextResponse.json(
            { error: 'An unexpected error occurred. Please try again.' },
            { status: 500 }
        )
    }
}
