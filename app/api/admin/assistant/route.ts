import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  searchParticipants,
  getParticipantById,
  getParticipantPerformance,
  getExamStats,
  getTeamStats,
  getOverallStats,
  searchExams,
  searchTeamsByName,
} from '@/lib/utils/assistant-queries'

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface AssistantRequest {
  query: string
  conversationHistory?: Message[]
}

/**
 * Parse user query to determine what data to fetch
 */
async function parseAndQueryDatabase(query: string): Promise<string> {
  const lowerQuery = query.toLowerCase()

  try {
    // Overall statistics
    if (
      lowerQuery.includes('overall') ||
      lowerQuery.includes('total') ||
      lowerQuery.includes('summary') ||
      lowerQuery.includes('statistics') ||
      lowerQuery.includes('stats')
    ) {
      const stats = await getOverallStats()
      return JSON.stringify({
        type: 'overall_stats',
        data: stats,
      })
    }

    // Participant search
    if (
      lowerQuery.includes('participant') ||
      lowerQuery.includes('student') ||
      lowerQuery.includes('candidate')
    ) {
      // Extract potential names, emails, or other identifiers
      const nameMatch = query.match(/(?:participant|student|candidate|person)\s+(?:named|called|with name)\s+([A-Za-z\s]+)/i)
      const emailMatch = query.match(/(?:email|e-mail)\s+([\w\.-]+@[\w\.-]+\.\w+)/i)
      const phoneMatch = query.match(/(?:phone|mobile|number)\s+([0-9]{10})/i)
      const schoolMatch = query.match(/(?:school|college|from)\s+([A-Za-z\s]+)/i)
      const teamMatch = query.match(/(?:team|group)\s+(?:named|called)?\s*["']?([^"']+)["']?/i)

      const searchParams: any = {}
      if (nameMatch) searchParams.name = nameMatch[1].trim()
      if (emailMatch) searchParams.email = emailMatch[1]
      if (phoneMatch) searchParams.phone = phoneMatch[1]
      if (schoolMatch) searchParams.school = schoolMatch[1].trim()
      if (teamMatch) searchParams.team = teamMatch[1].trim()

      // If no specific search, try to extract a name from the query
      if (!nameMatch && !emailMatch && !phoneMatch) {
        const words = query.split(/\s+/)
        const potentialName = words.find((w, i) => 
          i > 0 && (words[i-1].toLowerCase().includes('participant') || 
                   words[i-1].toLowerCase().includes('student') ||
                   words[i-1].toLowerCase().includes('candidate'))
        )
        if (potentialName && potentialName.length > 2) {
          searchParams.name = potentialName
        }
      }

      const participants = await searchParticipants(searchParams)
      
      // If we found participants, get performance for the first one if query asks for it
      if (participants.length > 0 && (lowerQuery.includes('performance') || lowerQuery.includes('score') || lowerQuery.includes('result'))) {
        const performance = await getParticipantPerformance(participants[0].id)
        return JSON.stringify({
          type: 'participant_performance',
          participant: participants[0],
          performance,
        })
      }

      return JSON.stringify({
        type: 'participants',
        data: participants,
        count: participants.length,
      })
    }

    // Performance queries
    if (lowerQuery.includes('performance') || lowerQuery.includes('score') || lowerQuery.includes('result')) {
      // Try to find participant ID or name
      const nameMatch = query.match(/(?:participant|student|candidate)\s+([A-Za-z\s]+)/i)
      if (nameMatch) {
        const participants = await searchParticipants({ name: nameMatch[1].trim() })
        if (participants.length > 0) {
          const performance = await getParticipantPerformance(participants[0].id)
          return JSON.stringify({
            type: 'participant_performance',
            participant: participants[0],
            performance,
          })
        }
      }
    }

    // Exam statistics
    if (lowerQuery.includes('exam') || lowerQuery.includes('test') || lowerQuery.includes('quiz')) {
      const examMatch = query.match(/(?:exam|test|quiz)\s+(?:named|called|titled)?\s*["']?([^"']+)["']?/i)
      if (examMatch) {
        const exams = await searchExams(examMatch[1].trim())
        if (exams.length > 0) {
          const stats = await getExamStats(exams[0].id)
          return JSON.stringify({
            type: 'exam_stats',
            exam: exams[0],
            stats,
          })
        }
      } else {
        // General exam stats
        const stats = await getExamStats()
        return JSON.stringify({
          type: 'exam_stats',
          stats,
        })
      }
    }

    // Team/leaderboard queries
    if (lowerQuery.includes('team') || lowerQuery.includes('leaderboard') || lowerQuery.includes('ranking')) {
      const teamStats = await getTeamStats()
      return JSON.stringify({
        type: 'team_stats',
        data: teamStats,
        count: teamStats.length,
      })
    }

    // Default: return overall stats
    const stats = await getOverallStats()
    return JSON.stringify({
      type: 'overall_stats',
      data: stats,
    })
  } catch (error: any) {
    return JSON.stringify({
      type: 'error',
      error: error.message,
    })
  }
}

/**
 * Call OpenAI API to generate response
 */
async function callOpenAI(messages: Message[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(`OpenAI API error: ${error.error?.message || JSON.stringify(error)}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.'
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role || 'participant'
    if (role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Parse request body
    const body: AssistantRequest = await request.json()
    const { query, conversationHistory = [] } = body

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Query database based on user query
    const dbContext = await parseAndQueryDatabase(query)

    // Build system message with context
    const systemMessage: Message = {
      role: 'system',
      content: `You are an AI assistant for an exam management system. You help admins query information about participants, exams, teams, and performance metrics.

Database Context:
${dbContext}

Instructions:
- Use the provided database context to answer questions accurately
- Be concise and helpful
- If the context shows no data, mention that
- Format numbers and statistics clearly
- For participant queries, provide relevant details like name, email, school, team
- For performance queries, include scores, completion rates, and statistics
- If you don't have enough information in the context, say so politely

Answer the user's question based on the database context provided.`,
    }

    // Build user message
    const userMessage: Message = {
      role: 'user',
      content: query,
    }

    // Prepare messages for OpenAI
    const messages: Message[] = [
      systemMessage,
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      userMessage,
    ]

    // Call OpenAI API
    const aiResponse = await callOpenAI(messages)

    return NextResponse.json({
      response: aiResponse,
      context: JSON.parse(dbContext),
    })
  } catch (error: any) {
    console.error('Assistant API error:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while processing your query' },
      { status: 500 }
    )
  }
}

