import {
  clearStateCookie,
  createSessionCookie,
  getStateCookie,
  randomId
} from "../../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.LB_DB) {
    return new Response("DB not configured", { status: 500 });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = getStateCookie(request);
  if (!code || !state || !cookieState || state !== cookieState) {
    return new Response("Invalid OAuth state", { status: 400 });
  }

  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  if (!clientId || !clientSecret) {
    return new Response("Google OAuth not configured", { status: 500 });
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });
  if (!tokenRes.ok) {
    return new Response("OAuth token error", { status: 400 });
  }
  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    return new Response("OAuth token missing", { status: 400 });
  }

  const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!profileRes.ok) {
    return new Response("OAuth profile error", { status: 400 });
  }
  const profile = await profileRes.json();
  const email = String(profile.email || "").toLowerCase();
  const name = profile.name || profile.given_name || "";
  const googleId = profile.sub || "";
  if (profile.email_verified === false) {
    return new Response("Email not verified", { status: 400 });
  }
  if (!email) {
    return new Response("OAuth email missing", { status: 400 });
  }

  let user = await env.LB_DB
    .prepare("SELECT id, email, role FROM users WHERE email = ?")
    .bind(email)
    .first();

  if (!user) {
    const insert = await env.LB_DB
      .prepare(
        "INSERT INTO users (email, name, provider, google_id, role, created_at) VALUES (?, ?, 'google', ?, 'user', datetime('now'))"
      )
      .bind(email, name || null, googleId || null)
      .run();
    const userId = insert.meta && insert.meta.last_row_id ? insert.meta.last_row_id : null;
    if (!userId) {
      return new Response("User create failed", { status: 500 });
    }
    user = { id: userId, email, role: "user" };
  } else {
    await env.LB_DB
      .prepare("UPDATE users SET google_id = COALESCE(google_id, ?), provider = 'google' WHERE id = ?")
      .bind(googleId || null, user.id)
      .run();
  }

  const sessionId = randomId();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await env.LB_DB
    .prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(sessionId, user.id, expiresAt)
    .run();

  const headers = new Headers();
  headers.set("Location", "/");
  headers.append("Set-Cookie", createSessionCookie(sessionId));
  headers.append("Set-Cookie", clearStateCookie());

  return new Response(null, { status: 302, headers });
}
