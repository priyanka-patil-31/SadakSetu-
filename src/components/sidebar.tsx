import { NavLink } from 'react-router-dom'
import {
  Bell,
  Brain,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquare,
  Settings,
  Shield,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Brand } from '@/components/brand'
import { useAuth } from '@/hooks/use-auth'

interface NavSection {
  title: string
  items: {
    label: string
    to: string
    icon: React.ComponentType<{ className?: string }>
    ariaLabel?: string
  }[]
}

const navSections: NavSection[] = [
  {
    title: 'MAIN MENU',
    items: [
      { label: 'Dashboard', to: '/', icon: LayoutDashboard },
      { label: 'Live Road Map', to: '/map', icon: Map },
      {
        label: 'Complaint Management',
        to: '/incidents',
        icon: ClipboardList,
        ariaLabel: 'Incidents',
      },
      { label: 'AI Detection', to: '/ai-detection', icon: Brain },
      { label: 'Citizens Management', to: '/citizens', icon: Users },
      { label: 'Repair Teams', to: '/teams', icon: Truck },
      { label: 'Analytics', to: '/analytics', icon: TrendingUp },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { label: 'Notifications', to: '/notifications', icon: Bell },
      { label: 'Feedback & Support', to: '/feedback', icon: MessageSquare },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { label: 'Settings', to: '/settings', icon: Settings },
      { label: 'Admin Roles & Permissions', to: '/roles', icon: Shield },
    ],
  },
]

type SidebarProps = { mobile?: boolean; onNavigate?: () => void }

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth()

  return (
    <aside
      className={cn(
        'flex w-[260px] flex-col bg-[#0F172A] text-white select-none',
        mobile ? 'h-full' : 'fixed inset-y-0 left-0 z-30 hidden lg:flex'
      )}
    >
      {/* Brand Header */}
      <div className="flex h-[76px] items-center px-6">
        <Brand />
      </div>

      <div className="mx-4 h-px bg-white/10" />

      {/* Nav Menu Scrollable Area */}
      <div className="flex flex-1 flex-col overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-white/10">
        <nav className="space-y-5 pl-3">
          {navSections.map((section, idx) => (
            <div key={section.title} className="space-y-1">
              {idx > 0 && idx === 2 && (
                <div className="mx-4 my-2.5 h-px bg-white/10" />
              )}
              <p className="px-4 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    aria-label={item.ariaLabel}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'group relative flex items-center gap-3.5 px-4 py-2.5 text-[13px] font-semibold transition-all duration-200',
                        isActive
                          ? 'rounded-l-2xl bg-[#F8FAFC] text-slate-900 shadow-sm before:absolute before:-top-3 before:right-0 before:h-3 before:w-3 before:bg-transparent after:absolute after:-bottom-3 after:right-0 after:h-3 after:w-3 after:bg-transparent'
                          : 'rounded-l-xl text-slate-300 hover:bg-white/5 hover:text-white'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            'h-4.5 w-4.5 shrink-0 transition-colors',
                            isActive
                              ? 'text-[#0E7A6E]'
                              : 'text-slate-400 group-hover:text-slate-200'
                          )}
                        />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer / User Profile & Logout */}
        <div className="mt-auto space-y-2 px-4 pt-6">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-500/20 text-xs font-bold text-teal-300">
              {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-200">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[10px] text-slate-400 capitalize">
                {user?.role || 'Admin'}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-rose-300"
            onClick={() => logout()}
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
