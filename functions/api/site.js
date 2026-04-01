import { requireAdmin } from "../_lib/auth.js";

const KEY = "siteCopy";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}

export async function onRequestGet({ env }) {
  const raw = await env.LB_DATA.get(KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      if (data && typeof data === "object" && !Array.isArray(data)) {
        return json(data);
      }
    } catch {}
  }
  return json({});
}

export async function onRequestPost({ request, env }) {
  const admin = await requireAdmin(request, env);
  if (!admin) {
    return new Response("Unauthorized", { status: 401 });
  }
  let data;
  try {
    data = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return json({ error: "Invalid data" }, 400);
  }
  await env.LB_DATA.put(KEY, JSON.stringify(data));
  return json({ ok: true });
}
