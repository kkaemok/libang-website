import { json, getSessionUser } from "../../_lib/auth.js";

export async function onRequestGet({ request, env }) {
  if (!env.LB_DB) return json({ error: "DB not configured" }, 500);
  const user = await getSessionUser(request, env);
  if (!user) return json({ error: "unauthorized" }, 401);
  return json(user);
}
