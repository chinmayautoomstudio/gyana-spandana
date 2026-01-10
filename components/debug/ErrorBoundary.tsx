'use client'

import React from 'react'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; errorInfo: React.ErrorInfo }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log detailed error information
    console.group('❌ [ERROR BOUNDARY] Caught Error')
    console.error('Error:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error info:', errorInfo)
    console.error('Component stack:', errorInfo.componentStack)
    console.error('Error object keys:', Object.keys(error))
    console.error('Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    console.groupEnd()

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const Fallback = this.props.fallback
        return (
          <Fallback
            error={this.state.error}
            errorInfo={this.state.errorInfo!}
          />
        )
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900 mb-2">Error Details:</h2>
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </div>
              {this.state.error.stack && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">Stack Trace:</h2>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
                    {this.state.error.stack}
                  </pre>
                </div>
              )}
              {this.state.errorInfo?.componentStack && (
                <div>
                  <h2 className="font-semibold text-gray-900 mb-2">Component Stack:</h2>
                  <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </div>
              )}
              <div className="pt-4">
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-[#C0392B] text-white rounded hover:bg-[#A93226]"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
