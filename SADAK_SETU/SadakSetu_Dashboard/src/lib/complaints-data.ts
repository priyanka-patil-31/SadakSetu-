export type ComplaintStatus = "Submitted" | "Under review" | "AI processing" | "Assigned" | "In progress" | "Resolved" | "Rejected";
export type BackendComplaintStatus =
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "AI_PROCESSING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "REJECTED";

export const complaintStatusLabels: Record<BackendComplaintStatus, ComplaintStatus> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  AI_PROCESSING: "AI processing",
  ASSIGNED: "Assigned",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  REJECTED: "Rejected",
};

export const validComplaintTransitions: Record<
  BackendComplaintStatus,
  BackendComplaintStatus[]
> = {
  SUBMITTED: ["UNDER_REVIEW", "ASSIGNED", "REJECTED"],
  UNDER_REVIEW: ["AI_PROCESSING", "ASSIGNED", "REJECTED"],
  AI_PROCESSING: ["UNDER_REVIEW", "ASSIGNED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "REJECTED"],
  IN_PROGRESS: ["RESOLVED"],
  RESOLVED: [],
  REJECTED: [],
};
export type ComplaintPriority = "Critical" | "High" | "Medium" | "Low";

export type ComplaintNote = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

export type Complaint = {
  id: string;
  backendId: string;
  title: string;
  category: string;
  location: string;
  address?: string;
  area?: string;
  zone: string;
  status: ComplaintStatus;
  backendStatus: BackendComplaintStatus;
  priority: ComplaintPriority;
  reporter: string;
  reporterEmail: string;
  reportedAt: string;
  description: string;
  image: string;
  assignedTeam: string;
  notes: ComplaintNote[];
  coordinates: [number, number] | null;
};

export const complaintTeams: string[] = [];
