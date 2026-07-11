/**
 * Auth utilities — PBKDF2 password hashing + HMAC-SHA256 session tokens
 * Zero external dependencies, uses only Web Crypto API.
 */

export const COOKIE_NAME = "contatinhos_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ── Password hashing ──────────────────────────────────────────────────────────
export async function hashPassword(password) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 },
    keyMat, 256
  );
  const hash = Buffer.from(bits).toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

export async function verifyPassword(password, stored) {
  if (!stored?.startsWith("pbkdf2:")) return false;
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const [, salt, expectedHash] = parts;
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100000 },
    keyMat, 256
  );
  const hash = Buffer.from(bits).toString("hex");
  if (hash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hash.length; i++) diff |= hash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}

// ── Session tokens (HMAC-SHA256) ──────────────────────────────────────────────
function getSecret() {
  return process.env.SESSION_SECRET || "contatinhos-dev-secret-CHANGE-IN-PROD";
}

async function getHMACKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function createToken(payload) {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const data = JSON.stringify({ ...payload, expiresAt });
  const encoded = Buffer.from(data).toString("base64url");
  const key = await getHMACKey(getSecret());
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
  const sigHex = Buffer.from(sig).toString("base64url");
  return `${encoded}.${sigHex}`;
}

export async function verifyToken(token) {
  if (!token) return null;
  try {
    const [encoded, sigHex] = token.split(".");
    if (!encoded || !sigHex) return null;
    const key = await getHMACKey(getSecret());
    const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(encoded));
    const expectedHex = Buffer.from(expectedSig).toString("base64url");
    if (sigHex !== expectedHex) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    if (payload.expiresAt < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
