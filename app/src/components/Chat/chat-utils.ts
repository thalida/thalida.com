export const LS_ADMIN_TOKEN_KEY = "admin_token";

export const COLORS = [
  "red",
  "blue",
  "gold",
  "pink",
  "jade",
  "teal",
  "gray",
  "mint",
  "plum",
  "sage",
  "rust",
  "lime",
  "navy",
  "wine",
  "rose",
  "onyx",
  "aqua",
  "sand",
  "dusk",
  "dawn",
  "coal",
  "snow",
  "iris",
  "opal",
  "ruby",
  "buff",
  "tan",
  "ash",
  "fawn",
  "coral",
];

export const ANIMALS = [
  "fox",
  "owl",
  "cat",
  "bat",
  "bee",
  "elk",
  "emu",
  "hen",
  "jay",
  "koi",
  "ram",
  "yak",
  "ape",
  "ant",
  "pup",
  "bug",
  "gnu",
  "hawk",
  "lynx",
  "newt",
  "orca",
  "puma",
  "seal",
  "wolf",
  "bear",
  "crow",
  "deer",
  "duck",
  "frog",
  "hare",
  "lark",
  "lion",
  "moth",
  "swan",
  "wren",
];

let _adminUsername: string | null = null;

export function setAdminUsername(name: string): void {
  _adminUsername = name;
}

export function generateRandomUsername(): string {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${color}-${animal}`;
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
