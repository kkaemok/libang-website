const KEY = "servers";
const DEFAULT = [
  { name: "능력야생", desc: "능력으로 야생에서 살아남으세요!" },
  { name: "국가전쟁", desc: "전장에서 신상을 점령하세요!" },
  { name: "플럼SMP", desc: "전투 중심" },
  { name: "동원서버", desc: "RPG서버를 즐기세요!" }
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
