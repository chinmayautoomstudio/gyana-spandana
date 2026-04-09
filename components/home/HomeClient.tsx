"use client";

import dynamic from "next/dynamic";
import { HeroCarousel } from "@/components/home/HeroCarousel";

const Statistics = dynamic(
  () =>
    import("@/components/home/Statistics").then((mod) => ({ default: mod.Statistics })),
  {
    loading: () => (
      <div className="min-h-[280px] bg-[#ECF0F1]" aria-hidden="true" />
    ),
  }
);

const Features = dynamic(() =>
  import("@/components/home/Features").then((mod) => ({ default: mod.Features }))
);

const HowItWorks = dynamic(() =>
  import("@/components/home/HowItWorks").then((mod) => ({ default: mod.HowItWorks }))
);

const Testimonials = dynamic(() =>
  import("@/components/home/Testimonials").then((mod) => ({ default: mod.Testimonials }))
);

const FAQ = dynamic(() =>
  import("@/components/home/FAQ").then((mod) => ({ default: mod.FAQ }))
);

const CTASection = dynamic(() =>
  import("@/components/home/CTASection").then((mod) => ({ default: mod.CTASection }))
);

const heroSlides = [
  {
    image: "/images/carousel-optimized/carousel-img-homepage-1.webp",
    title: "GYANA SPARDHA",
    description:
      "Join the ultimate quiz competition celebrating Odisha's rich cultural heritage, traditions, and knowledge. Test your expertise and compete for glory!",
    ctaText: "Register Your Team",
    ctaLink: "/signup",
  },
  {
    image: "/images/carousel-optimized/carousel-img-homepage-2.webp",
    title: "Test Your Knowledge of Odisha",
    description:
      "Explore the magnificent temples, festivals, traditions, and geography of Odisha through exciting quiz questions in Odia language.",
    ctaText: "Get Started",
    ctaLink: "/signup",
  },
  {
    image: "/images/carousel-optimized/carousel-img-homepage-3.webp",
    title: "Compete with Your Team",
    description:
      "Form a team of two and showcase your combined knowledge. Work together to achieve the highest scores and top the leaderboard!",
    ctaText: "Create Team",
    ctaLink: "/signup",
  },
  {
    image: "/images/carousel-optimized/carousel-img-homepage-4.webp",
    title: "Win Exciting Prizes",
    description:
      "Top performers get recognized and rewarded. Compete for certificates, recognition, and exciting prizes that celebrate your achievement!",
    ctaText: "Join Now",
    ctaLink: "/signup",
  },
];

const statistics = [
  {
    value: 352,
    label: "Registered Teams",
    suffix: "+",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    value: 704,
    label: "Active Participants",
    suffix: "+",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    value: 4570,
    label: "Quiz Questions",
    suffix: "+",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
  },
  {
    value: 50,
    label: "Schools Involved",
    suffix: "+",
    icon: (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V9l7-4 7 4v12M9 13h2m4 0h2M9 17h2m4 0h2" />
      </svg>
    ),
  },
];

const features = [
  {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: "Team Competition",
    description:
      "Form a team of two participants and compete together. Your combined scores determine your team's ranking on the leaderboard.",
    gradient: "hover:from-[#C0392B]/10 hover:to-[#E67E22]/10",
  },
  {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: "Odia Language Focus",
    description:
      "All quizzes are in Odia language, celebrating the rich cultural heritage, literature, poetry, and traditional arts of Odisha.",
    gradient: "hover:from-[#E67E22]/10 hover:to-[#F39C12]/10",
  },
  {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: "Real-time Leaderboard",
    description:
      "Track your team's progress with a live leaderboard. See rankings update in real-time as participants complete quizzes.",
    gradient: "hover:from-[#F39C12]/10 hover:to-[#E67E22]/10",
    ctaHref: "/competition/leaderboard",
    ctaLabel: "View competition leaderboard",
  },
  {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: "Secure & Fair",
    description:
      "Secure registration, individual login, and fair competition with advanced anti-cheating measures and transparent scoring.",
    gradient: "hover:from-[#E67E22]/10 hover:to-[#F39C12]/10",
  },
  {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    title: "Multiple Categories",
    description:
      "Questions cover diverse topics: History, Geography, Culture, Literature, Festivals, Temples, and more about Odisha.",
    gradient: "hover:from-[#F39C12]/10 hover:to-[#E67E22]/10",
  },
  {
    icon: (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: "Certificates & Recognition",
    description:
      "All participants receive certificates. Top performers get special recognition, prizes, and featured on the leaderboard.",
    gradient: "hover:from-[#F39C12]/10 hover:to-[#C0392B]/10",
  },
];

const steps = [
  {
    number: 1,
    title: "Register Your Team",
    description:
      "Create an account and register with your teammate. Complete your profile with all required information.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "Appear for Online Screening test",
    description:
      "Take the online screening test from anywhere. Complete the quiz within the given time to qualify for the next round.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    number: 3,
    title: "Top 64 Teams will have Oral Test",
    description:
      "Top 64 teams from the screening round are shortlisted for the oral round. Prepare and attend the oral test as per the schedule.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
  {
    number: 4,
    title: "Prize Distribution",
    description:
      "Winners are announced and prizes are distributed on 30th April 2026. Top teams receive certificates, recognition, and rewards.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2v-1m0 0V5.5A2.5 2.5 0 1019 8v.5m0 0v9m0-9h-2m2 0h2m-2 0h-2m2 9h-2m2 0h2m-2 0h-2" />
      </svg>
    ),
  },
];

const testimonials = [
  {
    name: "Priyanka Das",
    school: "DPS, Bhubaneswar",
    quote:
      "GYANA SPARDHA was an amazing experience! The questions were challenging and helped me learn so much about Odisha's culture. The team format made it even more fun!",
    rating: 5,
  },
  {
    name: "Rahul Mohanty",
    school: "KIIT University",
    quote:
      "I loved participating in this competition. The platform is user-friendly, and the real-time leaderboard kept us motivated throughout. Highly recommended!",
    rating: 5,
  },
  {
    name: "Sneha Patra",
    school: "Ravenshaw College",
    quote:
      "As someone passionate about Odia culture, this competition was perfect. The questions covered everything from history to festivals. Great initiative!",
    rating: 5,
  },
];

const faqItems = [
  {
    question: "How do I register for the competition?",
    answer:
      'Click on the "Register" button and fill out the registration form. You\'ll need to provide details for both team members, verify emails, and complete your profile. Once done, you\'ll receive a unique Team ID.',
  },
  {
    question: "What is the team size?",
    answer:
      "Each team must consist of exactly 2 participants. Both members need to register together and will share the same Team ID.",
  },
  {
    question: "Is it free to participate?",
    answer:
      "Yes, participation in GYANA SPARDHA is completely free. There are no registration fees or hidden charges.",
  },
  {
    question: "What topics are covered in the quizzes?",
    answer:
      "The quizzes cover various aspects of Odisha including history, geography, culture, literature, festivals, temples, traditional arts, and Odia language. Questions are designed to test comprehensive knowledge of Odisha.",
  },
  {
    question: "How are winners determined?",
    answer:
      "Winners are determined based on team scores. The team with the highest combined score from both participants tops the leaderboard. Scores are calculated based on correct answers and time taken.",
  },
  {
    question: "When is the competition?",
    answer:
      "The competition dates will be announced after registration closes. Registered participants will receive notifications about the competition schedule via email and on their dashboard.",
  },
  {
    question: "Can I change my team member after registration?",
    answer:
      "Team changes are generally not allowed after registration. Please ensure you register with the correct teammate. Contact support if you have exceptional circumstances.",
  },
  {
    question: "What happens if I miss the competition?",
    answer:
      "If you miss the scheduled competition time, you won't be able to participate in that round. However, check for any rescheduled sessions or future competitions.",
  },
];

export function HomeClient() {
  return (
    <div className="min-h-screen">
      <section className="relative">
        <HeroCarousel slides={heroSlides} />
      </section>

      <Statistics stats={statistics} />
      <Features features={features} />
      <HowItWorks steps={steps} />
      <Testimonials testimonials={testimonials} />
      <FAQ items={faqItems} />

      <CTASection
        title="Ready to Compete?"
        description="Join hundreds of participants in celebrating Odisha's rich cultural heritage. Register your team now and be part of this exciting journey!"
        primaryCTA={{
          text: "Register Your Team Now",
          href: "/signup",
        }}
      />
    </div>
  );
}
