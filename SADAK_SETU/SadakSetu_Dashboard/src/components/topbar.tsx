import { useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/notification-center'
import { useAuth } from '@/hooks/use-auth'

const titles: Record<string, string> = {
  '/': 'Overview',
  '/map': 'Live Monitoring',
  '/incidents': 'Complaints Management',
  '/analytics': 'Reports & Analytics',
  '/ai-detection': 'AI Pothole Detection',
  '/teams': 'Repair Teams & Staff',
  '/citizens': 'Citizen Management',
  '/roads': 'Road Network',
  '/settings': 'System Settings',
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const pageTitle = titles[location.pathname] || 'Overview'

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:px-8">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick} aria-label="Open navigation">
          <Menu className="h-5 w-5 text-slate-700" />
        </Button>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">{pageTitle}</h1>
      </div>

      {/* Center: Search pill */}
      <div className="relative mx-4 hidden max-w-md flex-1 md:block">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          aria-label="Search"
          className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-4 text-xs font-medium text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:outline-none"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notifications */}
        <NotificationCenter />

        {/* Settings button */}
        <button
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 sm:flex"
        >
          <Settings className="h-4 w-4" />
        </button>

        <div className="hidden h-6 w-px bg-slate-200 sm:block" />

        {/* User profile */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 to-emerald-500 text-xs font-bold text-white shadow-sm">
            {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-xs font-bold text-slate-900 leading-tight">{user?.name || 'Administrator'}</p>
            <span className="inline-block text-[10px] font-medium text-slate-500">Admin</span>
          </div>
        </div>
      </div>
    </header>
  )
}
