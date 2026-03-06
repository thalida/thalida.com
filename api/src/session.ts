import { SESSION_TOKEN_TTL_MS } from "./config";

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function bufToHex(buf: Uint8Array): string {
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuf(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]+$/.test(hex)) return null;
  const matches = hex.match(/.{2}/g);
  if (!matches) return null;
  return new Uint8Array(matches.map((b) => parseInt(b, 16)));
}

/**
 * Create an HMAC-based session token: "timestamp.hex_hmac".
 * Stateless — the server verifies by recomputing the HMAC.
 */
export async function createSessionToken(secret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(timestamp));
  return `${timestamp}.${bufToHex(new Uint8Array(sig))}`;
}

/**
 * Verify an HMAC-based session token.
 * Returns true if the token is valid and not expired.
 * Uses crypto.subtle.verify which is constant-time.
 */
export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  const dotIdx = token.indexOf(".");
  if (dotIdx === -1) return false;

  const timestamp = token.slice(0, dotIdx);
  const hmac = token.slice(dotIdx + 1);

  const ts = Number(timestamp);
  if (Number.isNaN(ts) || Date.now() - ts > SESSION_TOKEN_TTL_MS) return false;

  const key = await getHmacKey(secret);
  const hmacBytes = hexToBuf(hmac);
  if (!hmacBytes) return false;

  return crypto.subtle.verify("HMAC", key, hmacBytes, new TextEncoder().encode(timestamp));
}

/**
 * Create an HMAC-based client identity token: hex_hmac of the clientId.
 * Permanent — no timestamp, no expiry. Deterministic for a given clientId + secret.
 */
export async function createClientToken(clientId: string, secret: string): Promise<string> {
  const key = await getHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(clientId));
  return bufToHex(new Uint8Array(sig));
}

/**
 * Verify an HMAC-based client identity token.
 * Returns true if the token matches the clientId.
 * Uses crypto.subtle.verify which is constant-time.
 */
export async function verifyClientToken(clientId: string, token: string, secret: string): Promise<boolean> {
  const key = await getHmacKey(secret);
  const tokenBytes = hexToBuf(token);
  if (!tokenBytes) return false;
  return crypto.subtle.verify("HMAC", key, tokenBytes, new TextEncoder().encode(clientId));
}

/**
 * Timing-safe string comparison using HMAC digests.
 * Prevents timing attacks on secret comparisons.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const key = await getHmacKey("timing-safe-comparison-key");
  const encoder = new TextEncoder();
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const bytesA = new Uint8Array(sigA);
  const bytesB = new Uint8Array(sigB);
  let result = 0;
  for (let i = 0; i < bytesA.length; i++) result |= bytesA[i] ^ bytesB[i];
  return result === 0;
}
