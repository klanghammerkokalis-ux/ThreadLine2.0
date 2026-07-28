import Stripe from "stripe";

const priceMap = {
  report: "STRIPE_PRICE_REPORT",
  pro: "STRIPE_PRICE_PRO",
  career_story: "STRIPE_PRICE_CAREER_STORY",
  lifetime: "STRIPE_PRICE_LIFETIME"
};

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return new Response(JSON.stringify({ error: "Stripe is not configured yet." }), { status: 503 });
  }

  const { plan } = await request.json();
  const envName = priceMap[plan];
  const price = envName ? process.env[envName] : null;
  if (!price) {
    return new Response(JSON.stringify({ error: `Missing Stripe price for ${plan}.` }), { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const baseUrl = process.env.URL || "http://localhost:8888";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/#pricing`,
      billing_address_collection: "auto",
      customer_creation: "always",
      metadata: { plan, product: "threadline" }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Checkout could not be created." }), { status: 500 });
  }
};
