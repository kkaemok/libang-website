import { createStateCookie, randomId } from "../../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return new Response("Google OAuth not configured", { status: 500 });
  }
  const url = new URL(request.url);
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${url.origin}/api/auth/google/callback`;
  const state = randomId();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state
  });
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return new Response(null, {
    status: 302,
    headers: {
      "Location": authUrl,
      "Set-Cookie": createStateCookie(state)
    }
  });
}
