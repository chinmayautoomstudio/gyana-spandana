'use client'

import { useState } from 'react'
import { Button } from './Button'
import { OTPInput } from './OTPInput'

interface EmailVerificationProps {
    email: string
    isVerified: boolean
    onSendOTP: () => Promise<void>
    onVerifyOTP: (code: string) => Promise<void>
    disabled?: boolean
}

export function EmailVerification({
    email,
    isVerified,
    onSendOTP,
    onVerifyOTP,
    disabled = false
}: EmailVerificationProps) {
    const [otpSent, setOtpSent] = useState(false)
    const [otpCode, setOtpCode] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [countdown, setCountdown] = useState(0)

    const handleSendOTP = async () => {
        if (!email || disabled) return

        setIsSending(true)
        setError(null)

        try {
            await onSendOTP()
            setOtpSent(true)
            setCountdown(60) // 60 second countdown for resend

            // Start countdown
            const timer = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer)
                        return 0
                    }
                    return prev - 1
                })
            }, 1000)
        } catch (err: any) {
            setError(err.message || 'Failed to send OTP')
        } finally {
            setIsSending(false)
        }
    }

    const handleVerifyOTP = async () => {
        if (!otpCode || otpCode.length !== 6 || disabled) return

        setIsVerifying(true)
        setError(null)

        try {
            await onVerifyOTP(otpCode)
            setOtpSent(false)
            setOtpCode('')
        } catch (err: any) {
            setError(err.message || 'Invalid OTP code')
        } finally {
            setIsVerifying(false)
        }
    }

    if (isVerified) {
        return (
            <div className="flex items-center gap-2 text-green-600 text-sm mt-1">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                    />
                </svg>
                <span className="font-medium">Email verified</span>
            </div>
        )
    }

    return (
        <div className="mt-2 space-y-3">
            {/* Send OTP Button */}
            {!otpSent && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSendOTP}
                    isLoading={isSending}
                    disabled={!email || disabled}
                    className="w-full"
                >
                    {isSending ? 'Sending OTP...' : 'Send OTP'}
                </Button>
            )}

            {/* OTP Input and Verify */}
            {otpSent && (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter 6-digit OTP sent to {email}
                        </label>
                        <OTPInput
                            value={otpCode}
                            onChange={setOtpCode}
                            disabled={disabled || isVerifying}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={handleVerifyOTP}
                            isLoading={isVerifying}
                            disabled={otpCode.length !== 6 || disabled}
                            className="flex-1"
                        >
                            {isVerifying ? 'Verifying...' : 'Verify Email'}
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleSendOTP}
                            disabled={countdown > 0 || disabled}
                            className="flex-1"
                        >
                            {countdown > 0 ? `Resend (${countdown}s)` : 'Resend OTP'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <p className="text-red-600 text-sm">{error}</p>
            )}
        </div>
    )
}
