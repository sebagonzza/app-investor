import type { UserRole } from "@/types";

export function canWrite(role: UserRole | null | undefined): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canManageUsers(role: UserRole | null | undefined): boolean {
  return role === "ADMIN";
}

export function canDelete(role: UserRole | null | undefined): boolean {
  return role === "ADMIN";
}
