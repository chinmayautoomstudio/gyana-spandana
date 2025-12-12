'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function TestConnectionPage() {
  const [results, setResults] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const testConnection = async () => {
      const testResults: any = {
        envVars: {},
        connection: {},
        tables: {},
        auth: {},
      }

      try {
        // Test 1: Check environment variables
        testResults.envVars = {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          urlLength: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
          keyLength: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
          urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...`
            : 'Not set',
        }

        // Test 2: Create Supabase client
        const supabase = createClient()

        // Test 3: Test database connection - Check teams table
        try {
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('count')
            .limit(1)

          testResults.tables.teams = {
            success: !teamsError,
            error: teamsError?.message || null,
            message: teamsError ? 'Failed to connect to teams table' : 'Successfully connected to teams table',
          }
        } catch (error: any) {
          testResults.tables.teams = {
            success: false,
            error: error.message,
            message: 'Error connecting to teams table',
          }
        }

        // Test 4: Check participants table structure
        try {
          const { data: participantsData, error: participantsError } = await supabase
            .from('participants')
            .select('id, user_id, team_id, name, email')
            .limit(1)

          testResults.tables.participants = {
            success: !participantsError,
            error: participantsError?.message || null,
            message: participantsError
              ? `Error: ${participantsError.message}`
              : 'Successfully connected to participants table',
            hasUserId: participantsData ? true : false,
          }

          // Check if user_id column exists by checking the error message
          if (participantsError?.message?.includes('user_id') || participantsError?.message?.includes('column')) {
            testResults.tables.participants.hasUserIdColumn = false
            testResults.tables.participants.message += ' - user_id column may be missing!'
          } else if (!participantsError) {
            testResults.tables.participants.hasUserIdColumn = true
          }
        } catch (error: any) {
          testResults.tables.participants = {
            success: false,
            error: error.message,
            message: 'Error connecting to participants table',
            hasUserIdColumn: false,
          }
        }

        // Test 5: Test authentication service
        try {
          const {
            data: { user },
            error: authError,
          } = await supabase.auth.getUser()

          testResults.auth = {
            success: !authError,
            error: authError?.message || null,
            message: authError
              ? 'Auth service accessible (not logged in)'
              : 'Auth service working - user logged in',
            hasUser: !!user,
          }
        } catch (error: any) {
          testResults.auth = {
            success: false,
            error: error.message,
            message: 'Error accessing auth service',
          }
        }

        // Test 6: Overall connection status
        testResults.connection = {
          success:
            testResults.tables.teams?.success &&
            testResults.tables.participants?.success &&
            testResults.envVars.hasUrl &&
            testResults.envVars.hasKey,
          message: 'Connection test completed',
        }
      } catch (error: any) {
        testResults.connection = {
          success: false,
          error: error.message,
          message: 'Failed to initialize connection test',
        }
      }

      setResults(testResults)
      setLoading(false)
    }

    testConnection()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Testing Supabase connection...</p>
        </div>
      </div>
    )
  }

  const allGood =
    results.envVars?.hasUrl &&
    results.envVars?.hasKey &&
    results.tables?.teams?.success &&
    results.tables?.participants?.success

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Supabase Connection Test</h1>

          {/* Overall Status */}
          <div
            className={`mb-8 p-6 rounded-lg ${
              allGood ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
            }`}
          >
            <h2 className="text-xl font-semibold mb-2">
              {allGood ? '✅ Connection Successful!' : '❌ Connection Issues Found'}
            </h2>
            <p className="text-gray-700">{results.connection?.message}</p>
            {results.connection?.error && (
              <p className="text-red-600 mt-2 text-sm">{results.connection.error}</p>
            )}
          </div>

          {/* Environment Variables */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Environment Variables</h2>
            <div className="space-y-2 border rounded-lg p-4">
              <div className="flex items-center gap-2">
                {results.envVars?.hasUrl ? (
                  <span className="text-green-600 text-xl">✅</span>
                ) : (
                  <span className="text-red-600 text-xl">❌</span>
                )}
                <div>
                  <span className="font-medium">NEXT_PUBLIC_SUPABASE_URL:</span>{' '}
                  <span className={results.envVars?.hasUrl ? 'text-green-600' : 'text-red-600'}>
                    {results.envVars?.hasUrl ? 'Set' : 'Missing'}
                  </span>
                  {results.envVars?.hasUrl && (
                    <span className="text-gray-500 text-sm ml-2">
                      ({results.envVars?.urlLength} chars) - {results.envVars?.urlPreview}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {results.envVars?.hasKey ? (
                  <span className="text-green-600 text-xl">✅</span>
                ) : (
                  <span className="text-red-600 text-xl">❌</span>
                )}
                <div>
                  <span className="font-medium">NEXT_PUBLIC_SUPABASE_ANON_KEY:</span>{' '}
                  <span className={results.envVars?.hasKey ? 'text-green-600' : 'text-red-600'}>
                    {results.envVars?.hasKey ? 'Set' : 'Missing'}
                  </span>
                  {results.envVars?.hasKey && (
                    <span className="text-gray-500 text-sm ml-2">
                      ({results.envVars?.keyLength} chars)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Database Tables */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Tables</h2>
            <div className="space-y-4">
              {/* Teams Table */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  {results.tables?.teams?.success ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                  Teams Table
                </h3>
                <p className="text-sm text-gray-700 ml-6">{results.tables?.teams?.message}</p>
                {results.tables?.teams?.error && (
                  <p className="text-sm text-red-600 ml-6 mt-2 font-mono">{results.tables.teams.error}</p>
                )}
              </div>

              {/* Participants Table */}
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  {results.tables?.participants?.success ? (
                    <span className="text-green-600">✅</span>
                  ) : (
                    <span className="text-red-600">❌</span>
                  )}
                  Participants Table
                </h3>
                <p className="text-sm text-gray-700 ml-6">{results.tables?.participants?.message}</p>
                {results.tables?.participants?.hasUserIdColumn !== undefined && (
                  <div className="flex items-center gap-2 mt-2 ml-6">
                    {results.tables?.participants?.hasUserIdColumn ? (
                      <span className="text-green-600">✅</span>
                    ) : (
                      <span className="text-yellow-600">⚠️</span>
                    )}
                    <span className="text-sm">
                      user_id column: {results.tables?.participants?.hasUserIdColumn ? 'Exists' : 'Missing'}
                    </span>
                  </div>
                )}
                {results.tables?.participants?.error && (
                  <p className="text-sm text-red-600 ml-6 mt-2 font-mono">{results.tables.participants.error}</p>
                )}
              </div>
            </div>
          </div>

          {/* Authentication */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Authentication Service</h2>
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2">
                {results.auth?.success !== false ? (
                  <span className="text-green-600 text-xl">✅</span>
                ) : (
                  <span className="text-red-600 text-xl">❌</span>
                )}
                <span>{results.auth?.message}</span>
              </div>
              {results.auth?.error && (
                <p className="text-sm text-red-600 mt-2 font-mono">{results.auth.error}</p>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">Next Steps:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
              {!results.envVars?.hasUrl || !results.envVars?.hasKey ? (
                <li className="text-red-600">
                  ⚠️ Create .env.local file with your Supabase credentials (see ENV_SETUP.md)
                </li>
              ) : null}
              {results.tables?.participants?.hasUserIdColumn === false ? (
                <li className="text-yellow-600">
                  ⚠️ Run the migration script: docs/fix-user-id-column.sql in Supabase SQL Editor
                </li>
              ) : null}
              {!results.tables?.teams?.success ? (
                <li className="text-yellow-600">
                  ⚠️ Run the database schema: docs/database-schema.sql in Supabase SQL Editor
                </li>
              ) : null}
              {allGood && (
                <li className="text-green-600 font-semibold">✅ Everything looks good! You can now test registration and login.</li>
              )}
            </ul>
          </div>

          {/* Refresh Button */}
          <div className="mt-6">
            <button
              onClick={() => {
                setLoading(true)
                setTimeout(() => window.location.reload(), 100)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Refresh Test
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}



