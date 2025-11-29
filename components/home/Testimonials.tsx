'use client'

import { useState } from 'react'

interface Testimonial {
  name: string
  school: string
  quote: string
  rating: number
}

interface TestimonialsProps {
  testimonials: Testimonial[]
}

export function Testimonials({ testimonials }: TestimonialsProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  return (
    <section className="py-20 bg-[#ECF0F1]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#C0392B] to-[#E67E22] bg-clip-text text-transparent mb-4">
            What Participants Say
          </h2>
          <p className="text-xl text-gray-600">
            Hear from our amazing participants
          </p>
        </div>

        <div className="relative">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl p-8 md:p-12">
            {/* Quote Icon */}
            <div className="text-6xl text-[#C0392B]/20 mb-6">"</div>

            {/* Testimonial Content */}
            <div className="mb-6">
              <p className="text-xl md:text-2xl text-gray-700 leading-relaxed mb-6">
                {testimonials[currentIndex].quote}
              </p>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonials[currentIndex].rating)].map((_, i) => (
                  <svg
                    key={i}
                    className="w-6 h-6 text-[#F39C12]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Author */}
              <div>
                <div className="font-bold text-gray-900 text-lg">
                  {testimonials[currentIndex].name}
                </div>
                <div className="text-gray-600">
                  {testimonials[currentIndex].school}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-8 border-t border-gray-200">
              <button
                onClick={prevTestimonial}
                className="p-2 rounded-full bg-[#C0392B]/10 text-[#C0392B] hover:bg-[#C0392B]/20 transition-colors"
                aria-label="Previous testimonial"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Dots */}
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`transition-all ${
                      index === currentIndex
                        ? 'w-8 h-2 bg-[#C0392B] rounded-full'
                        : 'w-2 h-2 bg-gray-300 rounded-full hover:bg-gray-400'
                    }`}
                    aria-label={`Go to testimonial ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={nextTestimonial}
                className="p-2 rounded-full bg-[#C0392B]/10 text-[#C0392B] hover:bg-[#C0392B]/20 transition-colors"
                aria-label="Next testimonial"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

