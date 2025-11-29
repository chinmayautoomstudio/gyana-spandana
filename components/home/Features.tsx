'use client'

interface Feature {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
}

interface FeaturesProps {
  features: Feature[]
}

export function Features({ features }: FeaturesProps) {
  return (
    <section id="features" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#C0392B] to-[#E67E22] bg-clip-text text-transparent mb-4">
            Why Choose Gyana Spandana?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Experience the best quiz competition platform designed for Odisha's cultural heritage
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`group relative bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-8 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 ${feature.gradient}`}
            >
              <div className="mb-6 text-5xl">{feature.icon}</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

