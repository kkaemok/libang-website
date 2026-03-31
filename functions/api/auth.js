function isAuthorized(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return Boolean(match && env.ADMIN_KEY && match[1] === env.ADMIN_KEY);
}

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return new Response("OK", { status: 200 });
}
