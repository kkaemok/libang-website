import { getPaymentMode, json, matchesPaymentMode } from "../../_lib/payments.js";

export function onRequestGet({ env }) {
  const mode = getPaymentMode(env);
  const clientKey = String(env.TOSS_CLIENT_KEY || "").trim();

  if (!matchesPaymentMode(clientKey, mode)) {
    return json({ error: `A ${mode} Toss Payments client key is not configured.` }, 503);
  }

  return json({ clientKey, mode });
}
