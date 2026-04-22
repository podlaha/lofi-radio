import { ExternalLink, Github, Tag } from 'lucide-react'

const projects = [
  { id: 1, title: 'Smart Home Dashboard', description: 'A real-time dashboard for monitoring and controlling smart home devices. Features live data visualization, automation rules, and energy tracking.', tags: ['React', 'Node.js', 'MQTT', 'WebSocket'], status: 'Active', statusColor: 'bg-green-500', year: '2024' },
  { id: 2, title: 'E-Commerce Platform', description: 'Full-featured online store with product management, payment integration, order tracking, and analytics dashboard.', tags: ['React', 'PostgreSQL', 'Stripe', 'Redis'], status: 'Completed', statusColor: 'bg-[#e8a020]', year: '2024' },
  { id: 3, title: 'AI Content Generator', description: 'Automated content creation tool using large language models. Supports multiple formats, SEO optimization, and bulk generation.', tags: ['Python', 'FastAPI', 'OpenAI', 'React'], status: 'In Progress', statusColor: 'bg-yellow-500', year: '2025' },
  { id: 4, title: 'Inventory Management System', description: 'Enterprise-grade inventory tracking with barcode scanning, supplier management, automated reordering, and reporting.', tags: ['Vue.js', 'Django', 'MySQL', 'Docker'], status: 'Completed', statusColor: 'bg-[#e8a020]', year: '2023' },
  { id: 5, title: 'Real-time Chat Application', description: 'Scalable messaging platform with end-to-end encryption, file sharing, voice messages, and group channels.', tags: ['React', 'Socket.io', 'MongoDB', 'AWS'], status: 'Active', statusColor: 'bg-green-500', year: '2024' },
  { id: 6, title: 'Data Analytics Pipeline', description: 'ETL pipeline for processing large datasets with real-time visualizations, anomaly detection, and scheduled reports.', tags: ['Python', 'Apache Spark', 'Kafka', 'Grafana'], status: 'In Progress', statusColor: 'bg-yellow-500', year: '2025' },
]

export default function Projects() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#30363d] bg-[#1f2428] text-xs text-[#e8a020] mb-4">
          <Tag size={12} /> Portfolio
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Our <span className="gradient-text">Projects</span></h1>
        <p className="text-[#8b949e] text-lg max-w-2xl">A collection of products and services we've built — from small tools to large-scale platforms.</p>
      </div>

      <div className="flex items-center gap-2 mb-8 flex-wrap">
        {['All', 'Active', 'Completed', 'In Progress'].map((f, i) => (
          <button key={f} className={`px-4 py-1.5 rounded-full text-sm transition-all duration-200 ${i === 0 ? 'bg-[#e8a020] text-white' : 'border border-[#30363d] text-[#8b949e] hover:border-[#e8a020] hover:text-[#e8a020]'}`}>{f}</button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {projects.map((project) => (
          <div key={project.id} className="glass-card p-6 flex flex-col hover:border-[#e8a020]/30 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-[#e6edf3] text-lg leading-tight group-hover:text-[#e8a020] transition-colors">{project.title}</h3>
              <span className="text-xs text-[#8b949e] ml-2 mt-1 whitespace-nowrap">{project.year}</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${project.statusColor}`} />
              <span className="text-xs text-[#8b949e]">{project.status}</span>
            </div>
            <p className="text-sm text-[#8b949e] leading-relaxed flex-1 mb-4">{project.description}</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {project.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-md text-xs bg-[#2c3138] text-[#8b949e] border border-[#30363d]">{tag}</span>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-[#30363d]">
              <button className="flex items-center gap-1.5 text-xs text-[#8b949e] hover:text-[#e6edf3] transition-colors"><Github size={13} /> Source</button>
              <button className="flex items-center gap-1.5 text-xs text-[#e8a020] hover:text-[#f5b830] transition-colors ml-auto">View details <ExternalLink size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 glass-card p-8 text-center border-dashed">
        <p className="text-[#8b949e] text-sm">More projects coming soon...</p>
      </div>
    </div>
  )
}
