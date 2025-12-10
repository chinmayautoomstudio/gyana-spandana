import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loadingText?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText = 'Loading...',
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
    
    const variants = {
      primary: 'bg-[#C0392B] text-white hover:bg-[#A93226] focus:ring-[#C0392B]',
      secondary: 'bg-[#E67E22] text-white hover:bg-[#D35400] focus:ring-[#E67E22]',
      outline: 'border-2 border-[#C0392B] text-[#C0392B] hover:bg-[#C0392B]/10 focus:ring-[#C0392B]',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
    }

    const sizes = {
      sm: 'px-2.5 py-1.5 text-xs sm:text-sm min-h-[36px] sm:min-h-[40px]',
      md: 'px-2.5 py-2 sm:px-3 sm:py-2 text-xs sm:text-sm min-h-[44px]',
      lg: 'px-3 py-2.5 sm:px-4 sm:py-2.5 text-sm sm:text-base min-h-[44px] sm:min-h-[48px]',
    }

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText}
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

