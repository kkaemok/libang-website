const ITERATIONS = 120000;
const HASH = "SHA-256";

function toBase64(bytes) {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(str) {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: HASH },
    key,
    256
  );
  const hashBytes = new Uint8Array(bits);
  return `${ITERATIONS}.${toBase64(salt)}.${toBase64(hashBytes)}`;
}

export async function verifyPassword(password, stored) {
  if (!stored) return false;
  const parts = stored.split(".");
  if (parts.length !== 3) return false;
  const [iterStr, saltB64, hashB64] = parts;
  const iterations = Number(iterStr);
  if (!Number.isFinite(iterations)) return false;
  const salt = fromBase64(saltB64);
  const hash = fromBase64(hashB64);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: HASH },
    key,
    256
  );
  const compare = new Uint8Array(bits);
  return timingSafeEqual(hash, compare);
}
