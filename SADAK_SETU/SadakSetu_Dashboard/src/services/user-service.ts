import type { UserProfile, UserRole } from "@/lib/users-data";
import { apiClient } from "@/lib/http-client";

type BackendRole = "ADMIN" | "CITIZEN" | "REPAIR_TEAM";

type BackendUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  area: string | null;
  role: BackendRole;
  is_active: boolean;
  created_at: string;
  complaints_submitted?: number;
};

type UserProfilePayload = {
  full_name?: string;
  email?: string;
  phone?: string;
  area?: string;
};

const roleToLabel: Record<BackendRole, UserRole> = {
  ADMIN: "Administrator",
  CITIZEN: "Citizen",
  REPAIR_TEAM: "Field reporter",
};

const labelToRole: Record<UserRole, BackendRole> = {
  Administrator: "ADMIN",
  Citizen: "CITIZEN",
  "Field reporter": "REPAIR_TEAM",
};

function mapUser(user: BackendUser): UserProfile {
  return {
    id: user.id,
    name: user.full_name,
    email: user.email,
    phone: user.phone ?? "",
    area: user.area ?? "",
    status: user.is_active ? "Active" : "Inactive",
    role: roleToLabel[user.role],
    complaintsSubmitted: user.complaints_submitted ?? 0,
    joinedAt: user.created_at,
    lastActive: "Stored in database",
  };
}

export const userService = {
  async list(): Promise<UserProfile[]> {
    const response = await apiClient.get<{ items: BackendUser[] }>(
      "/users?page=1&page_size=100",
    );
    return response.data.items.map(mapUser);
  },

  async updateProfile(id: string, payload: UserProfilePayload): Promise<UserProfile> {
    const response = await apiClient.patch<BackendUser>(
      `/users/${encodeURIComponent(id)}`,
      payload,
    );
    return mapUser(response.data);
  },

  async updateStatus(id: string, isActive: boolean): Promise<UserProfile> {
    const response = await apiClient.patch<BackendUser>(
      `/users/${encodeURIComponent(id)}/status`,
      { is_active: isActive },
    );
    return mapUser(response.data);
  },

  async updateRole(id: string, role: UserRole): Promise<UserProfile> {
    const response = await apiClient.patch<BackendUser>(
      `/users/${encodeURIComponent(id)}/role`,
      { role: labelToRole[role] },
    );
    return mapUser(response.data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/users/${encodeURIComponent(id)}`);
  },

  async updateMyProfile(payload: { full_name?: string; email?: string }) {
    const response = await apiClient.patch<BackendUser>("/users/me", payload);
    return response.data;
  },

  async updatePassword(currentPassword: string, newPassword: string) {
    await apiClient.patch("/users/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async getPreferences() {
    const response = await apiClient.get<{
      email_alerts: boolean;
      critical_alerts: boolean;
      weekly_reports: boolean;
      compact_tables: boolean;
    }>("/users/me/preferences");
    return response.data;
  },

  async updatePreferences(preferences: {
    email_alerts: boolean;
    critical_alerts: boolean;
    weekly_reports: boolean;
    compact_tables: boolean;
  }) {
    await apiClient.patch("/users/me/preferences", preferences);
  },
};
