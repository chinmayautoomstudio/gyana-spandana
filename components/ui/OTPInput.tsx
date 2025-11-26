'use client'

import { useState, useRef, KeyboardEvent, ClipboardEvent } from 'react'

interface OTPInputProps {
    length?: number
    value: string
    onChange: (value: string) => void
    disabled?: boolean
}

export function OTPInput({ length = 6, value, onChange, disabled = false }: OTPInputProps) {
    const [otp, setOtp] = useState<string[]>(Array(length).fill(''))
    const inputRefs = useRef<(HTMLInputElement | null)[]>([])

    const handleChange = (index: number, digit: string) => {
        if (disabled) return

        // Only allow digits
        if (digit && !/^\d$/.test(digit)) return

        const newOtp = [...otp]
        newOtp[index] = digit
        setOtp(newOtp)
        onChange(newOtp.join(''))

        // Auto-focus next input
        if (digit && index < length - 1) {
            inputRefs.current[index + 1]?.focus()
        }
    }

    const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return

        // Handle backspace
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus()
        }
    }

    const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
        if (disabled) return

        e.preventDefault()
        const pastedData = e.clipboardData.getData('text/plain').slice(0, length)

        // Only allow digits
        if (!/^\d+$/.test(pastedData)) return

        const newOtp = pastedData.split('')
        while (newOtp.length < length) {
            newOtp.push('')
        }
        setOtp(newOtp)
        onChange(newOtp.join(''))

        // Focus last filled input
        const lastFilledIndex = Math.min(pastedData.length - 1, length - 1)
        inputRefs.current[lastFilledIndex]?.focus()
    }

    return (
        <div className="flex gap-2 justify-center">
            {otp.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => {
                        inputRefs.current[index] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={`
            w-12 h-12 text-center text-lg font-semibold
            border-2 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${digit ? 'border-blue-500' : 'border-gray-300'}
          `}
                />
            ))}
        </div>
    )
}
