import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/app-shell'
import { ProtectedRoute, PublicRoute } from '@/components/protected-route'
import { AuthProvider } from '@/context/auth-provider'
import { LoginPage } from '@/pages/login-page'
import { DashboardPage } from '@/pages/dashboard-page'
import './App.css'

const ComplaintsPage = lazy(() => import('@/pages/complaints-page').then((module) => ({ default: module.ComplaintsPage })))
const MapPage = lazy(() => import('@/pages/map-page').then((module) => ({ default: module.MapPage })))
const AiDetectionPage = lazy(() => import('@/pages/ai-detection-page').then((module) => ({ default: module.AiDetectionPage })))
const TeamsPage = lazy(() => import('@/pages/teams-page').then((module) => ({ default: module.TeamsPage })))
const UsersPage = lazy(() => import('@/pages/users-page').then((module) => ({ default: module.UsersPage })))
const ReportsPage = lazy(() => import('@/pages/reports-page').then((module) => ({ default: module.ReportsPage })))
const SettingsPage = lazy(() => import('@/pages/settings-page').then((module) => ({ default: module.SettingsPage })))
const RoadsPage = lazy(() => import('@/pages/roads-page').then((module) => ({ default: module.RoadsPage })))

function App() {
  return <BrowserRouter><AuthProvider><Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">Loading dashboard…</div>}><Routes><Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} /><Route element={<ProtectedRoute />}><Route element={<AppShell />}><Route path="/" element={<DashboardPage />} /><Route path="/incidents" element={<ComplaintsPage />} /><Route path="/roads" element={<RoadsPage />} /><Route path="/citizens" element={<UsersPage />} /><Route path="/analytics" element={<ReportsPage />} /><Route path="/map" element={<MapPage />} /><Route path="/ai-detection" element={<AiDetectionPage />} /><Route path="/teams" element={<TeamsPage />} /><Route path="/settings" element={<SettingsPage />} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Route></Routes></Suspense></AuthProvider></BrowserRouter>
}

export default App
