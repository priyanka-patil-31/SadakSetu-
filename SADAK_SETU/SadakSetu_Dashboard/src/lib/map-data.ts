import type { ComplaintPriority, ComplaintStatus } from '@/lib/complaints-data'

export type MapComplaint = { id: string; title: string; category: string; location: string; zone: string; status: ComplaintStatus; priority: ComplaintPriority; reported: string; description: string; coordinates: [number, number] }

export const mapComplaints: MapComplaint[] = []
