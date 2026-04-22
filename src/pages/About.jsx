import { Users, Target, Heart, Award } from 'lucide-react'

const values = [
  { icon: <Target size={22} className="text-[#e8a020]" />, title: 'Mission-Driven', description: 'We focus on delivering real value through thoughtful engineering and design.' },
  { icon: <Heart size={22} className="text-[#f85149]" />, title: 'Passion for Quality', description: 'Every detail matters. We craft products we are proud to put our name on.' },
  { icon: <Users size={22} className="text-[#f07020]" />, title: 'People First', description: 'Our users drive every decision. We build with empathy and purpose.' },
  { icon: <Award size={22} className="text-[#a371f7]" />, title: 'Continuous Improvement', description: 'We embrace feedback and constantly iterate to get better.' },
]

const timeline = [
  { year: '2020', title: 'Founded', desc: 'Started as a small side project with a vision to build useful tools.' },
  { year: '2021', title: 'First Product', desc: 'Launched our first production service, gaining early adopters.' },
  { year: '2022', title: 'Growing Team', desc: 'Expanded the team and launched multiple successful projects.' },
  { year: '2023', title: 'Platform Maturity', desc: 'Reached stability milestones and improved infrastructure significantly.' },
  { year: '2024', title: 'New Horizons', desc: 'Launched balkonek.eu as a unified platform for all our work.' },
  { year: '2025', title: 'Looking Ahead', desc: 'Continuing to grow, innovate, and deliver excellent experiences.' },
]

export default function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-6">About <span className="gradient-text">Us</span></h1>
        <p className="text-[#8b949e] text-lg max-w-2xl mx-auto leading-relaxed">We are a team of developers, designers, and problem-solvers passionate about building meaningful digital experiences.</p>
      </div>

      <div className="glass-card p-8 mb-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#e8a020]/5 to-transparent" />
        <div className="relative">
          <h2 className="text-2xl font-bold mb-4 text-[#e6edf3]">Our Mission</h2>
          <p className="text-[#8b949e] leading-relaxed text-lg">At balkonek.eu, we believe that technology should empower people, not overwhelm them. Our mission is to build tools and platforms that are intuitive, reliable, and genuinely useful — bringing a bit more efficiency and joy into everyday workflows.</p>
          <p className="text-[#8b949e] leading-relaxed mt-4">We draw on years of experience across web development, system architecture, data engineering, and product design to deliver solutions that stand the test of time.</p>
        </div>
      </div>

      <div className="mb-16">
        <h2 className="text-2xl font-bold mb-8 text-[#e6edf3]">Our Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {values.map(({ icon, title, description }) => (
            <div key={title} className="glass-card p-6 flex items-start gap-4 hover:border-[#e8a020]/30 transition-all duration-300">
              <div className="p-2.5 rounded-lg bg-[#2c3138] shrink-0">{icon}</div>
              <div>
                <h3 className="font-semibold text-[#e6edf3] mb-1">{title}</h3>
                <p className="text-sm text-[#8b949e] leading-relaxed">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-10 text-[#e6edf3]">Our Journey</h2>
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-[#30363d]" />
          <div className="space-y-8">
            {timeline.map(({ year, title, desc }) => (
              <div key={year} className="flex items-start gap-6 relative">
                <div className="shrink-0 w-10 h-10 rounded-full bg-[#1f2428] border-2 border-[#e8a020] flex items-center justify-center z-10">
                  <div className="w-2 h-2 rounded-full bg-[#e8a020]" />
                </div>
                <div className="glass-card p-4 flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-xs font-mono text-[#e8a020] font-semibold">{year}</span>
                    <h3 className="font-semibold text-[#e6edf3]">{title}</h3>
                  </div>
                  <p className="text-sm text-[#8b949e]">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
