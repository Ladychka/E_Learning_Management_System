import { apiClient } from "./client";

export type UserRole = "STUDENT" | "INSTRUCTOR" | "ADMIN";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: string;
  isEmailVerified?: boolean;
  avatarUrl?: string | null;
  profile?: {
    bio?: string | null;
    phone?: string | null;
    address?: string | null;
    education?: string | null;
    occupation?: string | null;
  } | null;
};

export type LoginResult = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  user: AuthUser;
};

export async function loginRequest(email: string, password: string) {
  const response = await apiClient.post("/auth/login", { email, password });
  return response.data.data as LoginResult;
}

export async function getMeRequest() {
  const response = await apiClient.get("/auth/me");
  return response.data.data as AuthUser;
}

export async function logoutRequest(refreshToken: string | null) {
  await apiClient.post("/auth/logout", { refreshToken });
}

export type UpdateProfilePayload = {
  firstName?: string;
  lastName?: string;
  bio?: string;
  phone?: string;
  address?: string;
  education?: string;
  occupation?: string;
};

export async function updateProfileRequest(payload: UpdateProfilePayload) {
  const response = await apiClient.patch("/auth/profile", payload);
  return response.data.data as AuthUser;
}

export async function changePasswordRequest(
  currentPassword: string,
  newPassword: string
) {
  const response = await apiClient.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });
  return response.data as { success: boolean; message: string };
}
