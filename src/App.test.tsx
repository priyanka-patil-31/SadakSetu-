import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AUTH_SESSION_KEY } from '@/lib/auth'
import { realAuthService } from '@/services/auth-service'
import { complaintService } from '@/services/complaints-service'
import { SHOW_DEMO_ADMIN_CREDENTIALS } from '@/lib/api-config'
import { userService } from '@/services/user-service'

const authenticatedUser = { id: 'operator-id', name: 'Authenticated operator', email: 'operator@municipality.example', role: 'Super admin' as const }

function stubAuthentication() {
  vi.spyOn(realAuthService, 'login').mockResolvedValue({ user: authenticatedUser, accessToken: 'test-session-token', expiresInSeconds: 3_600 })
}

async function login() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('Work email'), authenticatedUser.email)
  await user.type(screen.getByLabelText('Password'), 'backend-password')
  await user.click(screen.getByRole('button', { name: 'Sign in to dashboard' }))
  await screen.findByRole('heading', { name: 'Road safety overview' })
  return user
}

describe('SadakSetu authentication and empty live-data states', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.history.pushState({}, '', '/')
    vi.restoreAllMocks()
  })

  it('redirects unauthenticated users to the admin login', () => {
    render(<App />)

    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Work email')).toBeInTheDocument()
  })

  it('creates a session and opens the protected shell after backend authentication', async () => {
    stubAuthentication()
    render(<App />)

    await login()

    expect(screen.getByText('Complaint activity')).toBeInTheDocument()
    expect(screen.getByText('No complaints are available.')).toBeInTheDocument()
    expect(screen.getByText('No recent activity is available.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toContain('sessionId')
  })

  it('auto-submits the configured demo login', async () => {
    if (!SHOW_DEMO_ADMIN_CREDENTIALS) return
    stubAuthentication()
    render(<App />)

    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Login with Demo Account' }))

    expect(await screen.findByRole('heading', { name: 'Road safety overview' })).toBeInTheDocument()
    expect(realAuthService.login).toHaveBeenCalledTimes(1)
  })

  it('shows the demo login button in development and requires configured credentials', () => {
    render(<App />)

    const demoLogin = screen.getByRole('button', { name: 'Login with Demo Account' })
    expect(demoLogin).toBeInTheDocument()
    if (SHOW_DEMO_ADMIN_CREDENTIALS) {
      expect(demoLogin).toBeEnabled()
    } else {
      expect(demoLogin).toBeDisabled()
      expect(screen.getByText(/Configure VITE_DEMO_ADMIN_EMAIL and VITE_DEMO_ADMIN_PASSWORD in \.env\.local/)).toBeInTheDocument()
    }
  })

  it('shows validation errors without attempting authentication', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Sign in to dashboard' }))

    expect(screen.getByText('Email is required.')).toBeInTheDocument()
    expect(screen.getByText('Password is required.')).toBeInTheDocument()
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull()
  })

  it('surfaces backend authentication errors without creating a session', async () => {
    vi.spyOn(realAuthService, 'login').mockRejectedValue(new Error('Authentication service unavailable.'))
    render(<App />)

    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Work email'), authenticatedUser.email)
    await user.type(screen.getByLabelText('Password'), 'backend-password')
    await user.click(screen.getByRole('button', { name: 'Sign in to dashboard' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Authentication service unavailable.')
    expect(sessionStorage.getItem(AUTH_SESSION_KEY)).toBeNull()
  })

  it('renders the map with no temporary complaint markers', async () => {
    stubAuthentication()
    render(<App />)
    const user = await login()

    await user.click(screen.getByRole('link', { name: /View geographic map/ }))

    expect(await screen.findByRole('heading', { name: 'Live road map' })).toBeInTheDocument()
    expect(await screen.findByText(/complaints visible|Loading reports…/)).toBeInTheDocument()
  })

  it('renders the complaint empty state from the backend service', async () => {
    stubAuthentication()
    vi.spyOn(complaintService, 'list').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 100 })
    render(<App />)
    const user = await login()

    await user.click(screen.getByRole('link', { name: 'Incidents' }))

    expect(await screen.findByRole('heading', { name: 'Complaint management' })).toBeInTheDocument()
    expect(await screen.findByText('No backend records are currently available.')).toBeInTheDocument()
  })

  it('shows empty operational reports and a current export row count', async () => {
    stubAuthentication()
    render(<App />)
    const user = await login()

    await user.click(screen.getByRole('link', { name: 'Analytics' }))

    expect(await screen.findByRole('heading', { name: 'Reports & analytics' })).toBeInTheDocument()
    expect(screen.getByText('No complaints have been reported yet.')).toBeInTheDocument()
    expect(screen.getByText('11 data points')).toBeInTheDocument()
  })

  it('shows an empty notification center and administrator settings', async () => {
    stubAuthentication()
    render(<App />)
    const user = await login()

    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    const notifications = screen.getByRole('dialog', { name: 'Notification center' })
    expect(within(notifications).getByText('All caught up')).toBeInTheDocument()
    await user.click(within(notifications).getByRole('button', { name: 'Close notifications' }))

    await user.click(screen.getByRole('link', { name: 'Settings' }))
    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    vi.spyOn(userService, 'getPreferences').mockResolvedValue({ email_alerts: true, critical_alerts: true, weekly_reports: false, compact_tables: false })
    vi.spyOn(userService, 'updateMyProfile').mockResolvedValue({ full_name: authenticatedUser.name, email: authenticatedUser.email } as never)
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Profile details saved')
  })
})
