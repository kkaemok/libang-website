import { json, clearSessionCookie, getCookie } from "../../_lib/auth.js";

export async function onRequestPost({ request, env }) {
  const sessionId = getCookie(request, "lb_session");
  if (sessionId) {
    await env.LB_DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionId).run();
  }
  const res = json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
}
