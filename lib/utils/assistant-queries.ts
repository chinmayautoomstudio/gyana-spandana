import { createAdminClient } from '@/lib/supabase/admin'

export interface ParticipantInfo {
  id: string
  name: string
  email: string
  phone: string
  school_name: string
  team_name?: string
  team_code?: string
  is_participant1: boolean
  profile_completed: boolean
  created_at: string
}

export interface ExamAttemptInfo {
  id: string
  exam_id: string
  exam_title: string
  participant_id: string
  participant_name: string
  score: number
  total_questions: number
  correct_answers: number
  status: string
  started_at: string
  submitted_at?: string
  time_taken_minutes?: number
}

export interface PerformanceStats {
  totalAttempts: number
  averageScore: number
  highestScore: number
  lowestScore: number
  completionRate: number
  totalExams: number
  completedExams: number
}

export interface TeamStats {
  team_id: string
  team_name: string
  team_code: string
  participant1_name: string
  participant2_name: string
  total_team_score: number
  rank?: number
}

/**
 * Search teams by name
 */
export async function searchTeamsByName(teamName: string): Promise<Array<{ id: string; team_name: string; team_code: string }>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('teams')
    .select('id, team_name, team_code')
    .ilike('team_name', `%${teamName}%`)
    .limit(10)

  if (error) {
    throw new Error(`Failed to search teams: ${error.message}`)
  }

  return (data || []).map((t: any) => ({
    id: t.id,
    team_name: t.team_name,
    team_code: t.team_code,
  }))
}

/**
 * Search participants by various criteria
 */
export async function searchParticipants(query: {
  name?: string
  email?: string
  phone?: string
  school?: string
  team?: string
  teamId?: string
  limit?: number
}): Promise<ParticipantInfo[]> {
  const supabase = createAdminClient()
  let queryBuilder = supabase
    .from('participants')
    .select('*, teams(team_name, team_code)')
    .limit(query.limit || 50)

  if (query.name) {
    queryBuilder = queryBuilder.ilike('name', `%${query.name}%`)
  }
  if (query.email) {
    queryBuilder = queryBuilder.ilike('email', `%${query.email}%`)
  }
  if (query.phone) {
    queryBuilder = queryBuilder.eq('phone', query.phone)
  }
  if (query.school) {
    queryBuilder = queryBuilder.ilike('school_name', `%${query.school}%`)
  }
  if (query.teamId) {
    queryBuilder = queryBuilder.eq('team_id', query.teamId)
  } else if (query.team) {
    // If team is provided but not teamId, try to find team by name first
    const teams = await searchTeamsByName(query.team)
    if (teams.length > 0) {
      queryBuilder = queryBuilder.eq('team_id', teams[0].id)
    } else {
      // If no team found, return empty array
      return []
    }
  }

  const { data, error } = await queryBuilder.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to search participants: ${error.message}`)
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    school_name: p.school_name,
    team_name: p.teams?.team_name,
    team_code: p.teams?.team_code,
    is_participant1: p.is_participant1,
    profile_completed: p.profile_completed,
    created_at: p.created_at,
  }))
}

/**
 * Get participant by ID
 */
export async function getParticipantById(participantId: string): Promise<ParticipantInfo | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('participants')
    .select('*, teams(team_name, team_code)')
    .eq('id', participantId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(`Failed to get participant: ${error.message}`)
  }

  return {
    id: data.id,
    name: data.name,
    email: data.email,
    phone: data.phone,
    school_name: data.school_name,
    team_name: data.teams?.team_name,
    team_code: data.teams?.team_code,
    is_participant1: data.is_participant1,
    profile_completed: data.profile_completed,
    created_at: data.created_at,
  }
}

/**
 * Get participant's exam attempts and performance
 */
export async function getParticipantPerformance(participantId: string): Promise<{
  participant: ParticipantInfo | null
  attempts: ExamAttemptInfo[]
  stats: PerformanceStats
}> {
  const supabase = createAdminClient()

  const participant = await getParticipantById(participantId)
  if (!participant) {
    return {
      participant: null,
      attempts: [],
      stats: {
        totalAttempts: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        completionRate: 0,
        totalExams: 0,
        completedExams: 0,
      },
    }
  }

  const { data: attempts, error } = await supabase
    .from('exam_attempts')
    .select('*, exams(title), participants(name)')
    .eq('participant_id', participantId)
    .order('started_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to get participant performance: ${error.message}`)
  }

  const attemptsData: ExamAttemptInfo[] = (attempts || []).map((a: any) => ({
    id: a.id,
    exam_id: a.exam_id,
    exam_title: a.exams?.title || 'Unknown Exam',
    participant_id: a.participant_id,
    participant_name: a.participants?.name || participant.name,
    score: a.score || 0,
    total_questions: a.total_questions || 0,
    correct_answers: a.correct_answers || 0,
    status: a.status,
    started_at: a.started_at,
    submitted_at: a.submitted_at,
    time_taken_minutes: a.time_taken_minutes,
  }))

  const submittedAttempts = attemptsData.filter(a => a.status === 'submitted')
  const scores = submittedAttempts.map(a => a.score).filter(s => s > 0)

  const stats: PerformanceStats = {
    totalAttempts: attemptsData.length,
    averageScore: scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0,
    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    completionRate: attemptsData.length > 0
      ? Math.round((submittedAttempts.length / attemptsData.length) * 100)
      : 0,
    totalExams: attemptsData.length,
    completedExams: submittedAttempts.length,
  }

  return { participant, attempts: attemptsData, stats }
}

/**
 * Get exam statistics
 */
export async function getExamStats(examId?: string): Promise<{
  examId?: string
  examTitle?: string
  totalParticipants: number
  totalAttempts: number
  averageScore: number
  highestScore: number
  lowestScore: number
  completionRate: number
}> {
  const supabase = createAdminClient()

  let queryBuilder = supabase
    .from('exam_attempts')
    .select('score, status, exams(title, id)')

  if (examId) {
    queryBuilder = queryBuilder.eq('exam_id', examId)
  }

  const { data: attempts, error } = await queryBuilder

  if (error) {
    throw new Error(`Failed to get exam stats: ${error.message}`)
  }

  const attemptsData = attempts || []
  const submittedAttempts = attemptsData.filter((a: any) => a.status === 'submitted')
  const scores = submittedAttempts.map((a: any) => a.score || 0).filter((s: number) => s > 0)

  const examTitle = examId && attemptsData.length > 0
    ? (attemptsData[0] as any).exams?.title
    : undefined

  return {
    examId,
    examTitle,
    totalParticipants: new Set(attemptsData.map((a: any) => a.participant_id)).size,
    totalAttempts: attemptsData.length,
    averageScore: scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0,
    highestScore: scores.length > 0 ? Math.max(...scores) : 0,
    lowestScore: scores.length > 0 ? Math.min(...scores) : 0,
    completionRate: attemptsData.length > 0
      ? Math.round((submittedAttempts.length / attemptsData.length) * 100)
      : 0,
  }
}

/**
 * Get team statistics and leaderboard
 */
export async function getTeamStats(teamId?: string): Promise<TeamStats[]> {
  const supabase = createAdminClient()

  let queryBuilder = supabase
    .from('team_scores')
    .select('*, teams(team_name, team_code), exams(id)')
    .order('total_team_score', { ascending: false })

  if (teamId) {
    queryBuilder = queryBuilder.eq('team_id', teamId)
  }

  const { data: scores, error } = await queryBuilder

  if (error) {
    throw new Error(`Failed to get team stats: ${error.message}`)
  }

  // Get participant names for each team
  const teamStatsPromises = (scores || []).map(async (score: any) => {
    const { data: participants } = await supabase
      .from('participants')
      .select('name, is_participant1')
      .eq('team_id', score.team_id)

    const p1 = participants?.find((p: any) => p.is_participant1)
    const p2 = participants?.find((p: any) => !p.is_participant1)

    return {
      team_id: score.team_id,
      team_name: score.teams?.team_name || 'Unknown Team',
      team_code: score.teams?.team_code || '',
      participant1_name: p1?.name || 'Unknown',
      participant2_name: p2?.name || 'Unknown',
      total_team_score: score.total_team_score || 0,
      rank: score.rank,
    }
  })

  return Promise.all(teamStatsPromises)
}

/**
 * Get overall statistics
 */
export async function getOverallStats(): Promise<{
  totalParticipants: number
  totalTeams: number
  totalExams: number
  totalAttempts: number
  averageScore: number
  activeSessions: number
}> {
  const supabase = createAdminClient()

  const [participants, teams, exams, attempts, activeSessions] = await Promise.all([
    supabase.from('participants').select('*', { count: 'exact', head: true }),
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('exams').select('*', { count: 'exact', head: true }),
    supabase.from('exam_attempts').select('score, status'),
    supabase.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
  ])

  const submittedAttempts = attempts.data?.filter(a => a.status === 'submitted') || []
  const scores = submittedAttempts.map(a => a.score || 0).filter(s => s > 0)
  const averageScore = scores.length > 0
    ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
    : 0

  return {
    totalParticipants: participants.count || 0,
    totalTeams: teams.count || 0,
    totalExams: exams.count || 0,
    totalAttempts: attempts.data?.length || 0,
    averageScore,
    activeSessions: activeSessions.count || 0,
  }
}

/**
 * Search exams by title
 */
export async function searchExams(query: string): Promise<Array<{ id: string; title: string; status: string }>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('exams')
    .select('id, title, status')
    .ilike('title', `%${query}%`)
    .limit(20)

  if (error) {
    throw new Error(`Failed to search exams: ${error.message}`)
  }

  return (data || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    status: e.status,
  }))
}

export interface QuestionInfo {
  id: string
  question_text: string
  category: string | null
  difficulty_level: string | null
  points: number
  exam_id: string | null
  exam_title?: string | null
}

/**
 * Get question statistics
 */
export async function getQuestionStats(): Promise<{
  totalQuestions: number
  questionsByCategory: Array<{ category: string; count: number }>
  questionsByDifficulty: Array<{ difficulty: string; count: number }>
  questionsByExam: Array<{ examTitle: string; count: number }>
  unassignedQuestions: number
}> {
  const supabase = createAdminClient()

  const { data: questions, error } = await supabase
    .from('questions')
    .select('category, difficulty_level, exam_id, exams(title)')

  if (error) {
    throw new Error(`Failed to get question stats: ${error.message}`)
  }

  const questionsData = questions || []
  const totalQuestions = questionsData.length

  // Count by category
  const categoryCounts: Record<string, number> = {}
  questionsData.forEach((q: any) => {
    const category = q.category || 'Uncategorized'
    categoryCounts[category] = (categoryCounts[category] || 0) + 1
  })

  // Count by difficulty
  const difficultyCounts: Record<string, number> = {}
  questionsData.forEach((q: any) => {
    const difficulty = q.difficulty_level || 'medium'
    difficultyCounts[difficulty] = (difficultyCounts[difficulty] || 0) + 1
  })

  // Count by exam
  const examCounts: Record<string, number> = {}
  let unassignedCount = 0
  questionsData.forEach((q: any) => {
    if (q.exam_id && q.exams?.title) {
      const examTitle = q.exams.title
      examCounts[examTitle] = (examCounts[examTitle] || 0) + 1
    } else {
      unassignedCount++
    }
  })

  return {
    totalQuestions,
    questionsByCategory: Object.entries(categoryCounts).map(([category, count]) => ({
      category,
      count,
    })),
    questionsByDifficulty: Object.entries(difficultyCounts).map(([difficulty, count]) => ({
      difficulty,
      count,
    })),
    questionsByExam: Object.entries(examCounts).map(([examTitle, count]) => ({
      examTitle,
      count,
    })),
    unassignedQuestions: unassignedCount,
  }
}

/**
 * Search questions by various criteria
 */
export async function searchQuestions(query: {
  text?: string
  category?: string
  difficulty?: string
  examId?: string
  limit?: number
}): Promise<QuestionInfo[]> {
  const supabase = createAdminClient()
  let queryBuilder = supabase
    .from('questions')
    .select('id, question_text, category, difficulty_level, points, exam_id, exams(title)')
    .limit(query.limit || 50)

  if (query.text) {
    queryBuilder = queryBuilder.ilike('question_text', `%${query.text}%`)
  }
  if (query.category) {
    queryBuilder = queryBuilder.eq('category', query.category)
  }
  if (query.difficulty) {
    queryBuilder = queryBuilder.eq('difficulty_level', query.difficulty)
  }
  if (query.examId) {
    queryBuilder = queryBuilder.eq('exam_id', query.examId)
  }

  const { data: questions, error } = await queryBuilder.order('created_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to search questions: ${error.message}`)
  }

  return (questions || []).map((q: any) => ({
    id: q.id,
    question_text: q.question_text,
    category: q.category,
    difficulty_level: q.difficulty_level,
    points: q.points || 1,
    exam_id: q.exam_id,
    exam_title: q.exams?.title || null,
  }))
}

/**
 * Get questions grouped by category
 */
export async function getQuestionsByCategory(): Promise<Record<string, QuestionInfo[]>> {
  const supabase = createAdminClient()
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, category, difficulty_level, points, exam_id, exams(title)')
    .order('category', { ascending: true })

  if (error) {
    throw new Error(`Failed to get questions by category: ${error.message}`)
  }

  const grouped: Record<string, QuestionInfo[]> = {}
  ;(questions || []).forEach((q: any) => {
    const category = q.category || 'Uncategorized'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push({
      id: q.id,
      question_text: q.question_text,
      category: q.category,
      difficulty_level: q.difficulty_level,
      points: q.points || 1,
      exam_id: q.exam_id,
      exam_title: q.exams?.title || null,
    })
  })

  return grouped
}

/**
 * Get questions grouped by difficulty
 */
export async function getQuestionsByDifficulty(): Promise<Record<string, QuestionInfo[]>> {
  const supabase = createAdminClient()
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, question_text, category, difficulty_level, points, exam_id, exams(title)')
    .order('difficulty_level', { ascending: true })

  if (error) {
    throw new Error(`Failed to get questions by difficulty: ${error.message}`)
  }

  const grouped: Record<string, QuestionInfo[]> = {}
  ;(questions || []).forEach((q: any) => {
    const difficulty = q.difficulty_level || 'medium'
    if (!grouped[difficulty]) {
      grouped[difficulty] = []
    }
    grouped[difficulty].push({
      id: q.id,
      question_text: q.question_text,
      category: q.category,
      difficulty_level: q.difficulty_level,
      points: q.points || 1,
      exam_id: q.exam_id,
      exam_title: q.exams?.title || null,
    })
  })

  return grouped
}

/**
 * Get questions for a specific exam
 */
export async function getQuestionsByExam(examId: string): Promise<QuestionInfo[]> {
  return searchQuestions({ examId })
}

