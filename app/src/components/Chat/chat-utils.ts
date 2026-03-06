export { SS_SESSION_TOKEN_KEY } from "@lib/constants";

let _adminUsername: string | null = null;

export function setAdminUsername(name: string): void {
  _adminUsername = name;
}

export interface UsernameValidation {
  valid: boolean;
  error?: string;
}

export function validateUsername(name: string): UsernameValidation {
  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: "Username must be at least 2 characters." };
  }

  if (!/^[a-z0-9_\-.]+$/.test(trimmed)) {
    return { valid: false, error: "Only lowercase letters, numbers, hyphens, underscores, and dots." };
  }

  if (_adminUsername && trimmed.includes(_adminUsername)) {
    return { valid: false, error: "That name contains a reserved word." };
  }

  return { valid: true };
}
