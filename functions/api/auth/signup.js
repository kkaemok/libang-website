import { json, createSessionCookie, randomId } from "../../_lib/auth.js";
import { hashPassword } from "../../_lib/password.js";

export async function onRequestPost({ request, env }) {
  if (!env.LB_DB) {
    return json({ error: "DB not configured" }, 500);
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();

  if (!email || !password) {
    return json({ error: "이메일과 비밀번호를 입력하세요." }, 400);
  }
  if (password.length < 8) {
    return json({ error: "비밀번호는 8자 이상이어야 합니다." }, 400);
  }

  const existing = await env.LB_DB
    .prepare("SELECT id FROM users WHERE email = ?")
    .bind(email)
    .first();
  if (existing) {
    return json({ error: "이미 존재하는 이메일입니다." }, 409);
  }

  const passwordHash = await hashPassword(password);
  const result = await env.LB_DB
    .prepare(
      "INSERT INTO users (email, name, password_hash, provider, role, created_at) VALUES (?, ?, ?, 'local', 'user', datetime('now'))"
    )
    .bind(email, name || null, passwordHash)
    .run();

  const userId = result.meta && result.meta.last_row_id ? result.meta.last_row_id : null;
  if (!userId) {
    return json({ error: "회원가입 실패" }, 500);
  }

  const sessionId = randomId();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await env.LB_DB
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, userId, expiresAt)
    .run();

  const res = json({ ok: true });
  res.headers.append("Set-Cookie", createSessionCookie(sessionId));
  return res;
}
