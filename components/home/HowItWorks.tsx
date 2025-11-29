'use client'

interface Step {
  number: number
  title: string
  description: string
  icon: React.ReactNode
}

interface HowItWorksProps {
  steps: Step[]
}

export function HowItWorks({ steps }: HowItWorksProps) {
  return (
    <section id="how-it-works" className="py-20 bg-[#ECF0F1]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#C0392B] to-[#E67E22] bg-clip-text text-transparent mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get started in just a few simple steps
          </p>
        </div>

        <div className="relative">
          {/* Timeline Line - Desktop */}
          <div className="hidden lg:block absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-[#C0392B]/30 via-[#E67E22]/30 to-[#F39C12]/30" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Card */}
                <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-6 text-center hover:scale-105 transition-transform duration-300">
                  {/* Step Number Badge */}
                  <div className="relative mb-6">
                    <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                      {step.number}
                    </div>
                    {/* Timeline Dot */}
                    <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-[#C0392B] rounded-full border-4 border-white shadow-lg" />
                  </div>

                  {/* Icon */}
                  <div className="mb-4 text-4xl text-[#C0392B] flex justify-center">
                    {step.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

