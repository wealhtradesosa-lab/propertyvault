const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = require('stripe')(process.env.STRIPE_SECRET);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
    if (!email) return res.status(200).send('No email');

    let plan = 'starter', cycle = 'monthly';
    try {
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const amount = sub.items?.data?.[0]?.price?.unit_amount || 0;
        const interval = sub.items?.data?.[0]?.price?.recurring?.interval || 'month';
        plan = (amount === 2100 || amount === 19200) ? 'pro' : 'starter';
        cycle = interval === 'year' ? 'annual' : 'monthly';
      }
    } catch (e) { console.error('Sub error:', e); }

    await db.collection('users').doc(email).set({
      plan, cycle, stripeCustomerId: session.customer || '',
      stripeSubscriptionId: session.subscription || '',
      email, paidAt: admin.firestore.FieldValue.serverTimestamp(), status: 'active'
    }, { merge: true });
    console.log('OK:', email, plan, cycle);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    try {
      const customer = await stripe.customers.retrieve(sub.customer);
      const email = (customer.email || '').toLowerCase();
      if (email) await db.collection('users').doc(email).set({ plan: 'free', status: 'cancelled', cancelledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) { console.error(e); }
  }

  if (event.type === 'invoice.payment_failed') {
    const email = (event.data.object.customer_email || '').toLowerCase();
    if (email) await db.collection('users').doc(email).set({ status: 'past_due', lastFailedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  }

  res.status(200).json({ received: true });
});
