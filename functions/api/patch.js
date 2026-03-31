const KEY = "patchNotes";
const DEFAULT = [
  { date: "2026-03-09", type: "URGENT", title: "수표 돈 복사 버그 수정", desc: "수표 생성 시 발생하던 데이터 오류를 수정하고 관련 로그를 전수 조사 완료했습니다." },
  { date: "2026-03-08", type: "PATCH", title: "사소한 버그 및 서버 최적화", desc: "접속 시 간헐적으로 발생하던 튕김 현상과 맵 로딩 속도를 개선했습니다." },
  { date: "2026-03-05", type: "NEW", title: "셋홈(Sethome) 한도 확장", desc: "기존 3개에서 최대 5개까지 위치 저장이 가능하도록 업데이트되었습니다." },
  { date: "2026-03-22", type: "NEW", title: "셋홈(Sethome) 한도 확장", desc: "기존 3개에서 최대 5개까지 위치 저장이 가능하도록 업데이트되었습니다." }
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
