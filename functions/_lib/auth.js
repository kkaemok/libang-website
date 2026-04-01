const SESSION_COOKIE = "lb_session";
const STATE_COOKIE = "lb_oauth_state";
const SESSION_TTL_DAYS = 30;

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}

export function getCookie(request, name) {
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const parts = cookie.split(";").map((c) => c.trim());
  for (const part of parts) {
    if (part.startsWith(name + "=")) {
      return part.slice(name.length + 1);
    }
  }
  return null;
}

export function createSessionCookie(sessionId) {
  const maxAge = SESSION_TTL_DAYS * 24 * 60 * 60;
  return `${SESSION_COOKIE}=${sessionId}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function createStateCookie(state) {
  return `${STATE_COOKIE}=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
}

export function clearStateCookie() {
  return `${STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getStateCookie(request) {
  return getCookie(request, STATE_COOKIE);
}

export async function getSessionUser(request, env) {
  if (!env.LB_DB) return null;
  const sessionId = getCookie(request, SESSION_COOKIE);
  if (!sessionId) return null;
  const row = await env.LB_DB
    .prepare(
      `SELECT s.id as session_id, u.id as user_id, u.email, u.name, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .bind(sessionId)
    .first();
  if (!row) return null;
  return {
    id: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role
  };
}

export async function requireAdmin(request, env) {
  const user = await getSessionUser(request, env);
  if (!user || user.role !== "admin") return null;
  return user;
}

export function randomId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}
