import { getPaymentMode, json, matchesPaymentMode } from "../../_lib/payments.js";

export async function onRequestPost({ request, env }) {
  if (!env.LB_DB) {
    return json({ error: "Payment database is not configured." }, 503);
  }

  const mode = getPaymentMode(env);
  const secretKey = String(env.TOSS_SECRET_KEY || "").trim();
  if (!matchesPaymentMode(secretKey, mode)) {
    return json({ error: `A ${mode} Toss Payments secret key is not configured.` }, 503);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const paymentKey = typeof input.paymentKey === "string" ? input.paymentKey.trim() : "";
  const orderId = typeof input.orderId === "string" ? input.orderId.trim() : "";
  const amount = Number(input.amount);

  if (!paymentKey || !orderId || !Number.isSafeInteger(amount) || amount < 1) {
    return json({ error: "Invalid payment confirmation parameters." }, 400);
  }

  const order = await env.LB_DB.prepare(
    `SELECT id, order_name, amount, status, payment_key, method, approved_at, confirm_token
     FROM payment_orders WHERE id = ?`
  )
    .bind(orderId)
    .first();

  if (!order) {
    return json({ error: "Order not found." }, 404);
  }
  if (Number(order.amount) !== amount) {
    return json({ error: "The requested amount does not match the saved order amount." }, 400);
  }
  if (order.status === "DONE") {
    if (order.payment_key !== paymentKey) {
      return json({ error: "The payment key does not match the approved order." }, 409);
    }
    return json({
      ok: true,
      alreadyApproved: true,
      payment: {
        orderId: order.id,
        orderName: order.order_name,
        amount: Number(order.amount),
        method: order.method,
        approvedAt: order.approved_at
      }
    });
  }
  if (order.status !== "READY") {
    return json({ error: "The order cannot be approved in its current state." }, 409);
  }

  const authorization = btoa(`${secretKey}:`);
  const tossResponse = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: `Basic ${authorization}`,
      "Content-Type": "application/json",
      "Idempotency-Key": order.confirm_token
    },
    body: JSON.stringify({
      paymentKey,
      orderId,
      amount: Number(order.amount)
    })
  });
  const result = await tossResponse.json().catch(() => ({}));

  if (!tossResponse.ok) {
    return json({
      error: result.message || "Payment approval failed.",
      code: result.code || "PAYMENT_CONFIRM_FAILED"
    }, tossResponse.status);
  }

  await env.LB_DB.prepare(
    `UPDATE payment_orders
     SET status = 'DONE', payment_key = ?, method = ?, approved_at = ?
     WHERE id = ?`
  )
    .bind(paymentKey, result.method || "", result.approvedAt || new Date().toISOString(), orderId)
    .run();

  return json({
    ok: true,
    payment: {
      orderId,
      orderName: order.order_name,
      amount: Number(order.amount),
      method: result.method || "",
      approvedAt: result.approvedAt || ""
    }
  });
}
