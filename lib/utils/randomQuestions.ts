/**
 * Utility functions for random question selection and shuffling
 */

/**
 * Fisher-Yates shuffle algorithm for shuffling an array
 * @param array Array to shuffle
 * @returns New shuffled array (original array is not modified)
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use crypto.getRandomValues for cryptographically secure random
    const randomBytes = new Uint32Array(1)
    crypto.getRandomValues(randomBytes)
    const j = randomBytes[0] % (i + 1)
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Randomly select N items from an array
 * @param array Array to select from
 * @param count Number of items to select
 * @returns Array of selected items in random order
 */
export function randomSelect<T>(array: T[], count: number): T[] {
  if (count >= array.length) {
    // If count >= array length, return shuffled array
    return shuffleArray(array)
  }

  // Shuffle array and take first N items
  const shuffled = shuffleArray(array)
  return shuffled.slice(0, count)
}

/**
 * Select and shuffle questions for a participant
 * @param allQuestions All available questions for the exam
 * @param numberToSelect Number of questions to select (null = use all)
 * @returns Array of question IDs in the order to show to participant
 */
export function selectAndShuffleQuestions(
  allQuestions: Array<{ id: string }>,
  numberToSelect: number | null
): string[] {
  if (!numberToSelect || numberToSelect >= allQuestions.length) {
    // Use all questions, just shuffle them
    return shuffleArray(allQuestions.map(q => q.id))
  }

  // Randomly select N questions and shuffle them
  const selected = randomSelect(allQuestions, numberToSelect)
  return selected.map(q => q.id)
}
