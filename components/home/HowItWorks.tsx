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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8 items-stretch">
            {steps.map((step, index) => (
              <div key={index} className="relative flex h-full">
                {/* Step Card */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-6 text-center hover:shadow-xl transition-shadow duration-300 flex flex-col w-full h-full">
                  {/* Icon Container - Uniform styling */}
                  <div className="relative mb-6 flex justify-center">
                    {/* Outer gradient circle */}
                    <div className="w-20 h-20 bg-gradient-to-br from-[#C0392B] to-[#E67E22] rounded-full flex items-center justify-center shadow-lg">
                      {/* Inner white circle with red border */}
                      <div className="w-16 h-16 bg-white border-2 border-[#C0392B] rounded-full flex items-center justify-center">
                        {/* Icon */}
                        <div className="text-[#C0392B] flex justify-center items-center">
                          {step.icon}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content - Uniform spacing and sizing */}
                  <div className="flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-900 mb-3 min-h-[3rem] flex items-center justify-center">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed flex-1">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

