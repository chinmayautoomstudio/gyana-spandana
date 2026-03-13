'use client'

/* eslint-disable react-hooks/rules-of-hooks */

import { use } from 'react'

/**
 * Debug wrapper for React's use() hook
 * Logs detailed information about what's being passed to use()
 */
export function debugUse<T>(value: T, context?: string): T {
  const debugInfo = {
    context: context || 'unknown',
    type: typeof value,
    constructor: value?.constructor?.name || 'unknown',
    isPromise: value instanceof Promise,
    isContext: value && typeof value === 'object' && '$$typeof' in value,
    stringValue: String(value).substring(0, 200),
    fullValue: value,
  }

  console.group(`🔍 [DEBUG] use() call in ${debugInfo.context}`)
  console.log('Type:', debugInfo.type)
  console.log('Constructor:', debugInfo.constructor)
  console.log('Is Promise:', debugInfo.isPromise)
  console.log('Is Context:', debugInfo.isContext)
  console.log('String representation:', debugInfo.stringValue)
  console.log('Full value:', debugInfo.fullValue)
  console.log('Stack trace:', new Error().stack)
  console.groupEnd()

  // Check if value is valid for use()
  if (!debugInfo.isPromise && !debugInfo.isContext) {
    console.error('❌ [ERROR] Invalid type passed to use():', {
      type: debugInfo.type,
      constructor: debugInfo.constructor,
      value: debugInfo.fullValue,
      context: debugInfo.context,
    })
  }

  try {
    return use(value as any)
  } catch (error: any) {
    console.error('❌ [ERROR] use() hook failed:', {
      error: error.message,
      stack: error.stack,
      value: debugInfo.fullValue,
      type: debugInfo.type,
      constructor: debugInfo.constructor,
      context: debugInfo.context,
    })
    throw error
  }
}

/**
 * Hook to debug useRouter() return value
 */
export function debugUseRouter(router: any, context?: string) {
  console.group(`🔍 [DEBUG] useRouter() in ${context || 'unknown'}`)
  console.log('Router type:', typeof router)
  console.log('Router constructor:', router?.constructor?.name)
  console.log('Router keys:', router ? Object.keys(router) : 'null')
  console.log('Router value:', router)
  console.groupEnd()

  // Check if router has expected methods
  if (router && typeof router === 'object') {
    const expectedMethods = ['push', 'replace', 'prefetch', 'back', 'forward', 'refresh']
    const hasMethods = expectedMethods.filter((method) => typeof router[method] === 'function')
    console.log('Router methods found:', hasMethods)
    if (hasMethods.length < expectedMethods.length) {
      console.warn('⚠️ [WARN] Router missing expected methods:', {
        expected: expectedMethods,
        found: hasMethods,
      })
    }
  }

  return router
}

/**
 * Hook to debug any hook return value
 */
export function debugHook<T>(hookName: string, value: T, context?: string): T {
  console.group(`🔍 [DEBUG] ${hookName} in ${context || 'unknown'}`)
  console.log('Value type:', typeof value)
  console.log('Value constructor:', value?.constructor?.name)
  console.log('Value:', value)
  console.log('Stack trace:', new Error().stack)
  console.groupEnd()
  return value
}
