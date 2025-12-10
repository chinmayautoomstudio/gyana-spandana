'use client'

import Link from 'next/link'

interface QuickLinkCardProps {
  icon: string
  title: string
  description: string
  href: string
  linkText: string
}

export function QuickLinkCard({ icon, title, description, href, linkText }: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className="bg-white/70 backdrop-blur-xl rounded-xl border border-white/20 shadow-lg p-6 hover:shadow-xl transition-all hover:border-gray-300 group"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 mb-3">{description}</p>
          <span className="text-sm font-medium text-[#C0392B] group-hover:text-[#A93226] inline-flex items-center gap-1">
            {linkText}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}

