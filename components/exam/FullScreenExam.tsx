'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { examSecurityService, SecurityViolation } from '@/lib/services/examSecurityService'
import { Button } from '@/components/ui/Button'

interface FullScreenExamProps {
  children: React.ReactNode
  onViolation?: (violation: SecurityViolation) => void
  onExamStart?: () => void
  onExamEnd?: () => void
  showWarning?: boolean
  warningMessage?: string
  examDurationMinutes?: number
}

export const FullScreenExam: React.FC<FullScreenExamProps> = ({
  children,
  onViolation,
  onExamStart,
  onExamEnd,
  showWarning = true,
  warningMessage = "This exam is monitored for security purposes. Please ensure you follow all exam rules.",
  examDurationMinutes
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isSecurityActive, setIsSecurityActive] = useState(false)
  const [showConsentModal, setShowConsentModal] = useState(true)
  const examContainerRef = useRef<HTMLDivElement>(null)

  // Cleanup effect - stop security monitoring when component unmounts
  useEffect(() => {
    return () => {
      if (examSecurityService.isSecurityActive()) {
        console.log('🧹 Component unmounting - stopping security monitoring')
        examSecurityService.stopMonitoring()
      }
    }
  }, [])

  useEffect(() => {
    // Check if already in fullscreen on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFullscreen(examSecurityService.isInFullscreen())

    // Listen for fullscreen changes
    const handleFullscreenChange = () => {
      const isFullscreenNow = examSecurityService.isInFullscreen()
      setIsFullscreen(isFullscreenNow)
      
      if (!isFullscreenNow && isSecurityActive) {
        console.warn('⚠️ Fullscreen exited unexpectedly')
      }
    }

    // Standard API (Chrome, Edge, Opera)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    // Firefox-specific events
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    // Webkit API (Safari, older Chrome)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    // MS API (IE/Edge legacy)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [isSecurityActive])

  const handleViolation = useCallback((violation: SecurityViolation) => {
    // Silently pass violation to parent for logging
    if (onViolation) {
      onViolation(violation)
    }
  }, [onViolation])

  const startExam = async () => {
    try {
      console.log('🚀 User clicked "Accept & Start Exam" - entering fullscreen...')
      
      // Enter fullscreen first
      const fullscreenSuccess = await examSecurityService.enterFullscreen()
      
      if (!fullscreenSuccess) {
        const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1
        const errorMessage = isFirefox 
          ? 'Please allow fullscreen mode to start the exam. In Firefox, you may need to press F11 or click the fullscreen button. This is required for security purposes.'
          : 'Please allow fullscreen mode to start the exam. This is required for security purposes.'
        alert(errorMessage)
        console.error('❌ Fullscreen failed')
        return
      }

      // Wait a moment for fullscreen to fully activate
      await new Promise(resolve => setTimeout(resolve, 300))

      // Verify fullscreen is actually active
      const isActuallyFullscreen = examSecurityService.isInFullscreen()
      console.log('🔍 Fullscreen check:', { isActuallyFullscreen })
      
      if (!isActuallyFullscreen) {
        const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1
        const errorMessage = isFirefox 
          ? 'Fullscreen mode was not activated. Please try again or use F11 to enter fullscreen manually, then refresh the page.'
          : 'Fullscreen mode was not activated. Please try again or use F11 to enter fullscreen manually.'
        alert(errorMessage)
        console.error('❌ Fullscreen verification failed')
        return
      }

      console.log('✅ Fullscreen activated, starting security monitoring...')

      // Start security monitoring with exam duration
      examSecurityService.startMonitoring(handleViolation, examDurationMinutes)
      setIsSecurityActive(true)
      setShowConsentModal(false)
      setIsFullscreen(true)

      console.log('✅ Security monitoring started:', {
        isActive: examSecurityService.isSecurityActive(),
        isFullscreen: examSecurityService.isInFullscreen()
      })

      if (onExamStart) {
        onExamStart()
      }

      console.log('✅ Exam started with full security monitoring - user consent confirmed')
    } catch (error) {
      console.error('❌ Failed to start exam:', error)
      alert(`Failed to start exam: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`)
      setShowConsentModal(true)
    }
  }

  const endExam = async () => {
    try {
      // Stop security monitoring for exam completion
      examSecurityService.stopSecurityForExamCompletion()
      setIsSecurityActive(false)

      // Exit fullscreen
      await examSecurityService.exitFullscreen()

      if (onExamEnd) {
        onExamEnd()
      }

      console.log('✅ Exam ended successfully')
    } catch (error) {
      console.error('❌ Error ending exam:', error)
    }
  }

  const handleConsentAccept = () => {
    startExam()
  }

  const handleConsentDecline = () => {
    alert('You must accept the exam terms to proceed. The exam cannot be started without fullscreen mode and security monitoring.')
  }

  if (showConsentModal && showWarning) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#C0392B]/10 rounded-full mb-4">
              <svg className="w-8 h-8 text-[#C0392B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Security Notice</h2>
            <p className="text-gray-600">{warningMessage}</p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Security Measures:</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Fullscreen mode will be activated</li>
                <li>Functional keys (F1-F12, Ctrl+C, Alt+Tab, etc.) will be disabled</li>
                <li>Right-click context menu will be disabled</li>
                <li>Tab switching and window resizing will be prevented</li>
                <li>Developer tools detection will be active</li>
                <li>All security violations will be logged</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-900 mb-2">Important:</h3>
              <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                <li>Do not attempt to switch tabs or minimize the window</li>
                <li>Do not use keyboard shortcuts or functional keys</li>
                <li>Do not open developer tools or inspect elements</li>
                <li>Violations may result in exam termination</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={handleConsentDecline}
              className="px-6 py-2"
            >
              Decline
            </Button>
            <Button
              variant="primary"
              onClick={handleConsentAccept}
              className="px-6 py-2"
            >
              Accept & Start Exam
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div ref={examContainerRef} className="relative">
      {/* Security Status Bar */}
      {isSecurityActive && (
        <div className="fixed top-0 left-0 right-0 bg-[#C0392B] text-white px-4 py-2.5 z-50 flex items-center justify-between text-sm shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-2-2l-3 3a1 1 0 000 2l3 3a1 1 0 002-2l-1.5-1.5h4.5a1 1 0 100-2h-4.5l1.5-1.5z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">Security Monitoring Active</span>
            </div>
            <div className="flex items-center gap-2">
              {isFullscreen ? (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 01-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>Fullscreen Mode</span>
                </>
              ) : (
                <span className="text-yellow-300">⚠️ Not in fullscreen</span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={endExam}
            className="text-white hover:bg-white/20 border-white/30"
          >
            End Exam
          </Button>
        </div>
      )}

      {/* Exam Content */}
      <div className={isSecurityActive ? 'pt-14' : ''}>
        {children}
      </div>
    </div>
  )
}

export default FullScreenExam
