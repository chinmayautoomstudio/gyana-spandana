'use client'

import Link from 'next/link'

interface StatsCardProps {
  title: string
  value: number | string
  icon: string
  color: 'blue' | 'green' | 'purple' | 'indigo' | 'red' | 'yellow' | 'orange'
  href?: string
  subtitle?: string
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, icon, color, href, subtitle, trend }: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-600',
    green: 'bg-green-500/10 text-green-600',
    purple: 'bg-purple-500/10 text-purple-600',
    indigo: 'bg-indigo-500/10 text-indigo-600',
    red: 'bg-red-500/10 text-red-600',
    yellow: 'bg-yellow-500/10 text-yellow-600',
    orange: 'bg-orange-500/10 text-orange-600',
  }

  const content = (
    <div className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-4 hover:shadow-xl transition-shadow h-full flex flex-col">
      <div className="flex items-start justify-between flex-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 mb-0.5">{title}</p>
          <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
          <div className="min-h-[16px] mt-0.5">
            {subtitle && subtitle.trim() && (
              <p className="text-xs text-gray-500 leading-tight">{subtitle}</p>
            )}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 mt-1.5 text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend.isPositive ? "M13 7l5 5m0 0l-5 5m5-5H6" : "M13 17l5-5m0 0l-5-5m5 5H6"} />
              </svg>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center flex-shrink-0 ml-3`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

