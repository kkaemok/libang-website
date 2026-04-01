import { json, createSessionCookie, randomId } from "../../_lib/auth.js";
import { verifyPassword } from "../../_lib/password.js";

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
  if (!email || !password) {
    return json({ error: "이메일과 비밀번호를 입력하세요." }, 400);
  }

  const user = await env.LB_DB
    .prepare("SELECT id, email, name, password_hash, role, provider FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (!user) {
    return json({ error: "계정을 찾을 수 없습니다." }, 401);
  }
  if (!user.password_hash) {
    return json({ error: "소셜 로그인 계정입니다. Google 로그인을 이용하세요." }, 400);
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return json({ error: "비밀번호가 올바르지 않습니다." }, 401);
  }

  const sessionId = randomId();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await env.LB_DB
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, user.id, expiresAt)
    .run();

  const res = json({
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  });
  res.headers.append("Set-Cookie", createSessionCookie(sessionId));
  return res;
}
