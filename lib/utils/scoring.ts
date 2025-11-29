/**
 * Scoring utilities for exam system
 */

export interface QuestionAnswer {
  questionId: string
  selectedAnswer: 'A' | 'B' | 'C' | 'D'
  correctAnswer: 'A' | 'B' | 'C' | 'D'
  points: number
}

/**
 * Calculate score for a single answer
 */
export function calculateAnswerScore(
  selectedAnswer: 'A' | 'B' | 'C' | 'D',
  correctAnswer: 'A' | 'B' | 'C' | 'D',
  points: number
): { isCorrect: boolean; pointsEarned: number } {
  const isCorrect = selectedAnswer === correctAnswer
  return {
    isCorrect,
    pointsEarned: isCorrect ? points : 0
  }
}

/**
 * Calculate total score from answers
 */
export function calculateTotalScore(answers: QuestionAnswer[]): {
  totalScore: number
  correctAnswers: number
  totalQuestions: number
} {
  let totalScore = 0
  let correctAnswers = 0

  answers.forEach(answer => {
    const result = calculateAnswerScore(
      answer.selectedAnswer,
      answer.correctAnswer,
      answer.points
    )
    if (result.isCorrect) {
      correctAnswers++
      totalScore += result.pointsEarned
    }
  })

  return {
    totalScore,
    correctAnswers,
    totalQuestions: answers.length
  }
}

/**
 * Calculate percentage score
 */
export function calculatePercentage(score: number, totalPossible: number): number {
  if (totalPossible === 0) return 0
  return Math.round((score / totalPossible) * 100)
}

/**
 * Check if exam is passed
 */
export function isPassed(score: number, passingScore: number | null): boolean {
  if (passingScore === null) return true
  return score >= passingScore
}

