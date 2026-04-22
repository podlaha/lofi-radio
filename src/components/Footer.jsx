import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-[#30363d] bg-[#181c20] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#e8a020] to-[#f07020] flex items-center justify-center text-white text-xs font-black">B</span>
              <span className="font-bold gradient-text">balkonek.eu</span>
            </div>
            <p className="text-sm text-[#8b949e] leading-relaxed">A modern platform built with passion. Showcasing projects and ideas.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Navigation</h3>
            <ul className="space-y-2">
              {[['/', 'Home'], ['/projects', 'Projects'], ['/about', 'About'], ['/contacts', 'Contacts']].map(([href, label]) => (
                <li key={href}>
                  <Link to={href} className="text-sm text-[#8b949e] hover:text-[#e8a020] transition-colors">{label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#e6edf3] mb-3">Contact</h3>
            <ul className="space-y-2">
              <li className="text-sm text-[#8b949e]">info@balkonek.eu</li>
              <li className="text-sm text-[#8b949e]">Prague, Czech Republic</li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-[#30363d] flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-[#8b949e]">© {new Date().getFullYear()} balkonek.eu. All rights reserved.</p>
          <p className="text-xs text-[#8b949e]">Built with React &amp; Tailwind CSS</p>
        </div>
      </div>
    </footer>
  )
}
