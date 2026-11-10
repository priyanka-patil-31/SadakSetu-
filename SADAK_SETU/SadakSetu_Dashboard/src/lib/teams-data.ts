export type TeamAvailability = 'Available' | 'On job' | 'Off duty'

export type RepairTeam = {
  id: string
  name: string
  zone: string
  lead: string
  phone: string
  email: string
  availability: TeamAvailability
  members: number
  specialties: string[]
  assignedComplaints: string[]
  updatedAt: string
}

