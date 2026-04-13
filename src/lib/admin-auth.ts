const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const ADMIN_SESSION_COOKIE = "admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 12;

function getJwtSecret(): string {
  return process.env.ADMIN_JWT_SECRET || process.env.ADMIN_AUTH_SECRET || "local-dev-jwt-secret";
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecodeBytes(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function base64UrlEncodeString(value: string): string {
  return base64UrlEncodeBytes(encoder.encode(value));
}

function base64UrlDecodeString(value: string): string {
  return decoder.decode(base64UrlDecodeBytes(value));
}

async function createHmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(getJwtSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64UrlEncodeBytes(new Uint8Array(signature));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isValidAdminCredentials(username: string, password: string): boolean {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
  return username === expectedUsername && password === expectedPassword;
}

export async function createAdminSessionToken(username: string): Promise<string> {
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: username,
    role: "admin",
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE
  };

  const headerEncoded = base64UrlEncodeString(JSON.stringify(header));
  const payloadEncoded = base64UrlEncodeString(JSON.stringify(payload));
  const unsigned = `${headerEncoded}.${payloadEncoded}`;
  const signature = await createHmac(unsigned);
  return `${unsigned}.${signature}`;
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [headerEncoded, payloadEncoded, signature] = parts;
  const unsigned = `${headerEncoded}.${payloadEncoded}`;
  const expectedSignature = await createHmac(unsigned);

  if (!safeEqual(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(base64UrlDecodeString(payloadEncoded)) as {
      sub?: string;
      role?: string;
      exp?: number;
    };
    if (!payload.sub || payload.role !== "admin" || !payload.exp) return false;
    return payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
