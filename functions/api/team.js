const KEY = "team";
const DEFAULT = [
  { initials: "LB", name: "리뱅총괄", role: "Network Lead" },
  { initials: "GM", name: "운영팀", role: "Community Manager" },
  { initials: "DEV", name: "개발팀", role: "Core Developer" },
  { initials: "MOD", name: "중재팀", role: "Support & Moderation" }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}

function isAuthorized(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return Boolean(match && env.ADMIN_KEY && match[1] === env.ADMIN_KEY);
}

export async function onRequestGet({ env }) {
  const raw = await env.LB_DATA.get(KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) return json(data);
    } catch {}
  }
  return json(DEFAULT);
}

export async function onRequestPost({ request, env }) {
  if (!isAuthorized(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!Array.isArray(data)) {
    return json({ error: "Invalid data" }, 400);
  }
  await env.LB_DATA.put(KEY, JSON.stringify(data));
  return json({ ok: true });
}
