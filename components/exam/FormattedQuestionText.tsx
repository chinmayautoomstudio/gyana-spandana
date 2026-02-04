'use client'

import React from 'react'

interface FormattedQuestionTextProps {
  text: string
  className?: string
}

export const FormattedQuestionText: React.FC<FormattedQuestionTextProps> = ({
  text,
  className = ''
}) => {
  // Regex to match code blocks: ```language or ```
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  
  // Split text into parts: regular text and code blocks
  const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = []
  let lastIndex = 0
  let match

  while ((match = codeBlockRegex.exec(text)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.substring(lastIndex, match.index)
      })
    }

    // Add code block
    parts.push({
      type: 'code',
      content: match[2], // The code content
      language: match[1] || undefined // The language if specified
    })

    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last code block
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.substring(lastIndex)
    })
  }

  // If no code blocks found, return text as-is
  if (parts.length === 0) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <code
              key={index}
              className="bg-gray-100 px-2 py-1 rounded text-sm font-mono"
            >
              {part.content}
            </code>
          )
        } else {
          // Render text with line breaks preserved
          return (
            <span key={index} className="whitespace-pre-wrap">
              {part.content}
            </span>
          )
        }
      })}
    </span>
  )
}

export default FormattedQuestionText
