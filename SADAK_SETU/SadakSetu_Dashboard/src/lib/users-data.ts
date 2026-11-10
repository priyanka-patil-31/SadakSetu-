export type UserStatus = 'Active' | 'Inactive'
export type UserRole = 'Citizen' | 'Field reporter' | 'Administrator'

export type UserProfile = {
  id: string
  name: string
  email: string
  phone: string
  area: string
  status: UserStatus
  role: UserRole
  complaintsSubmitted: number
  joinedAt: string
  lastActive: string
}

