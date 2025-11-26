'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface CarouselSlide {
  image: string
  title: string
  description: string
}

interface CarouselProps {
  slides: CarouselSlide[]
  autoSlideInterval?: number
}

export function Carousel({ slides, autoSlideInterval = 5000 }: CarouselProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, autoSlideInterval)

    return () => clearInterval(interval)
  }, [slides.length, autoSlideInterval])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Branding - Top Left */}
      <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
          <span className="text-2xl font-bold text-blue-600">GS</span>
        </div>
        <Link href="/" className="text-white font-bold text-xl">
          Gyana Spandana
        </Link>
      </div>

      {/* Carousel Slides */}
      <div className="relative h-full w-full">
        {slides.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Background Image */}
            <div className="relative h-full w-full">
              <Image
                src={slide.image}
                alt={slide.title}
                fill
                className="object-cover"
                priority={index === 0}
              />
              {/* Dark Overlay for text readability */}
              <div className="absolute inset-0 bg-black/40" />
            </div>

            {/* Marketing Text - Bottom Left */}
            <div className="absolute bottom-20 left-8 z-20 text-white max-w-lg">
              <h2 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                {slide.title}
              </h2>
              <p className="text-lg md:text-xl opacity-90 leading-relaxed">
                {slide.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Dots - Bottom Center */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-300 ${
              index === currentSlide
                ? 'w-8 h-2 bg-white rounded-full'
                : 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

