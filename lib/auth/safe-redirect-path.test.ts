import { describe, it, expect } from 'vitest'
import {
  parseSafeInternalRedirectPath,
  resolvePostLoginRedirectPath,
} from './safe-redirect-path'

describe('parseSafeInternalRedirectPath', () => {
  it('accepts encoded internal paths', () => {
    expect(parseSafeInternalRedirectPath('%2Fdashboard')).toBe('/dashboard')
  })

  it('rejects login and signup targets', () => {
    expect(parseSafeInternalRedirectPath('/login')).toBeNull()
    expect(parseSafeInternalRedirectPath('/signup')).toBeNull()
  })

  it('rejects protocol-relative and absolute URLs', () => {
    expect(parseSafeInternalRedirectPath('//evil.com')).toBeNull()
    expect(parseSafeInternalRedirectPath('https://evil.com')).toBeNull()
  })

  it('preserves query on safe paths', () => {
    expect(parseSafeInternalRedirectPath('/exams/abc?tab=1')).toBe('/exams/abc?tab=1')
    expect(parseSafeInternalRedirectPath('%2Fexams%2Fabc%3Ftab%3D1')).toBe('/exams/abc?tab=1')
  })
})

describe('resolvePostLoginRedirectPath', () => {
  it('admin defaults to /admin', () => {
    expect(
      resolvePostLoginRedirectPath({ role: 'admin', redirectedFromParam: null })
    ).toBe('/admin')
  })

  it('admin uses redirectedFrom when under /admin', () => {
    expect(
      resolvePostLoginRedirectPath({
        role: 'admin',
        redirectedFromParam: '/admin/users',
      })
    ).toBe('/admin/users')
  })

  it('admin ignores non-admin redirectedFrom', () => {
    expect(
      resolvePostLoginRedirectPath({
        role: 'admin',
        redirectedFromParam: '/dashboard',
      })
    ).toBe('/admin')
  })

  it('participant uses safe redirectedFrom or dashboard', () => {
    expect(
      resolvePostLoginRedirectPath({
        role: 'participant',
        redirectedFromParam: '%2Fexams%2F1',
      })
    ).toBe('/exams/1')
    expect(
      resolvePostLoginRedirectPath({ role: 'host', redirectedFromParam: null })
    ).toBe('/dashboard')
  })
})
