'use client'

import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  type: 'exam_submission' | 'participant_registration' | 'exam_status_change' | 'question_added'
  title: string
  description: string
  timestamp: string
  link?: string
}

interface ActivityFeedProps {
  activities: Activity[]
  maxItems?: number
}

export function ActivityFeed({ activities, maxItems = 10 }: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems)

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'exam_submission':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      case 'participant_registration':
        return 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z'
      case 'exam_status_change':
        return 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
      case 'question_added':
        return 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
      default:
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'exam_submission':
        return 'text-green-600 bg-green-50'
      case 'participant_registration':
        return 'text-blue-600 bg-blue-50'
      case 'exam_status_change':
        return 'text-yellow-600 bg-yellow-50'
      case 'question_added':
        return 'text-purple-600 bg-purple-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (displayActivities.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">No recent activity</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {displayActivities.map((activity) => {
        const content = (
          <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className={`w-8 h-8 ${getActivityColor(activity.type)} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getActivityIcon(activity.type)} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{activity.title}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>
          </div>
        )

        if (activity.link) {
          return (
            <a key={activity.id} href={activity.link} className="block">
              {content}
            </a>
          )
        }

        return <div key={activity.id}>{content}</div>
      })}
    </div>
  )
}

