export const MESSAGE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_WARNINGS = 3;
export const ADMIN_USERNAME = "thalida";
export const RESERVATION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_MESSAGE_LENGTH = 500;
export const MIN_USERNAME_LENGTH = 2;
export const MAX_USERNAME_LENGTH = 20;
export const MAX_USERNAME_RETRIES = 50;

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

export function generateRandomUsername(): string {
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${color}-${animal}`;
}
