import { getPaymentPlan, json, optionalText } from "../../_lib/payments.js";

export async function onRequestPost({ request, env }) {
  if (!env.LB_DB) {
    return json({ error: "Payment database is not configured." }, 503);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, 400);
  }

  const plan = getPaymentPlan(input && input.planId);
  const customerName = optionalText(input && input.customerName, 100);
  const customerEmail = optionalText(input && input.customerEmail, 100);

  if (!plan) {
    return json({ error: "Invalid payment plan." }, 400);
  }
  if (customerName === null || customerEmail === null) {
    return json({ error: "Customer details are too long or invalid." }, 400);
  }

  const orderId = `LB-${crypto.randomUUID().replace(/-/g, "")}`;
  const confirmToken = crypto.randomUUID();

  await env.LB_DB.prepare(
    `INSERT INTO payment_orders
      (id, plan_id, order_name, amount, customer_name, customer_email, status, confirm_token)
     VALUES (?, ?, ?, ?, ?, ?, 'READY', ?)`
  )
    .bind(orderId, plan.id, plan.orderName, plan.amount, customerName, customerEmail, confirmToken)
    .run();

  return json({
    orderId,
    orderName: plan.orderName,
    amount: plan.amount,
    currency: "KRW"
  }, 201);
}
