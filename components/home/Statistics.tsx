'use client'

import { useState, useEffect, useRef } from 'react'

interface Stat {
  value: number
  label: string
  icon: React.ReactNode
  suffix?: string
}

interface StatisticsProps {
  stats: Stat[]
}

export function Statistics({ stats }: StatisticsProps) {
  const [countedValues, setCountedValues] = useState<number[]>(stats.map(() => 0))
  const [hasAnimated, setHasAnimated] = useState(false)
  const sectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setHasAnimated(true)
            stats.forEach((stat, index) => {
              animateValue(index, 0, stat.value, 2000)
            })
          }
        })
      },
      { threshold: 0.3 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [hasAnimated, stats])

  const animateValue = (index: number, start: number, end: number, duration: number) => {
    const startTime = performance.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)

      setCountedValues((prev) => {
        const newValues = [...prev]
        newValues[index] = Math.floor(start + (end - start) * easeOutQuart)
        return newValues
      })

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  return (
    <section ref={sectionRef} className="py-20 bg-[#ECF0F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 text-center hover:scale-105 transition-transform duration-300"
            >
              <div className="flex justify-center mb-4 text-[#C0392B]">
                {stat.icon}
              </div>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#C0392B] to-[#E67E22] bg-clip-text text-transparent mb-2">
                {countedValues[index]}
                {stat.suffix}
              </div>
              <div className="text-sm md:text-base font-medium text-gray-600">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

