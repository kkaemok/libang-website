export const PAYMENT_PLANS = Object.freeze({
  starter: Object.freeze({
    id: "starter",
    orderName: "L.B ONLINE 응원 패키지",
    amount: 5000
  }),
  standard: Object.freeze({
    id: "standard",
    orderName: "L.B ONLINE 서포터 패키지",
    amount: 10000
  }),
  premium: Object.freeze({
    id: "premium",
    orderName: "L.B ONLINE 스폰서 패키지",
    amount: 30000
  })
});

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}

export function getPaymentPlan(planId) {
  return PAYMENT_PLANS[String(planId || "")] || null;
}

export function getPaymentMode(env) {
  return env.TOSS_PAYMENT_MODE === "live" ? "live" : "test";
}

export function matchesPaymentMode(key, mode) {
  return typeof key === "string" && key.trim().startsWith(`${mode}_`);
}

export function optionalText(value, maxLength) {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length <= maxLength ? text : null;
}
