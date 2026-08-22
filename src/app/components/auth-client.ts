"use client";

export type ClientAuthUser = {
  username: string;
  balance: number;
  role: string;
  is2faEnabled?: boolean;
  is2faVerified?: boolean;
  emailVerified?: boolean;
};

export const AUTH_CHANGED_EVENT = "follower-auth-changed";

export function announceAuthChange(user: ClientAuthUser | null): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT, { detail: { user } }));
}

export function clearAuthBootstrap(): void {
  announceAuthChange(null);
}
