const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

// Stripe webhook handler
// Set secret with: firebase functions:config:set stripe.secret="sk_live_xxx" stripe.webhook_secret="whsec_xxx"
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const stripe = require('stripe')(functions.config().stripe.secret);
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      functions.config().stripe.webhook_secret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle checkout completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
    if (!email) { console.error('No email in session'); return res.status(200).send('No email'); }

    // Get subscription details
    let plan = 'starter', cycle = 'monthly';
    try {
      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription);
        const amount = sub.items?.data?.[0]?.price?.unit_amount || 0;
        const interval = sub.items?.data?.[0]?.price?.recurring?.interval || 'month';
        
        // Detect plan from amount
        if (amount === 2100 || amount === 19200) plan = 'pro';
        else plan = 'starter';
        cycle = interval === 'year' ? 'annual' : 'monthly';
      }
    } catch (e) { console.error('Error getting subscription:', e); }

    // Save to Firestore
    await db.collection('users').doc(email).set({
      plan,
      cycle,
      stripeCustomerId: session.customer || '',
      stripeSubscriptionId: session.subscription || '',
      email,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    }, { merge: true });

    console.log(`✅ ${email} → ${plan}/${cycle}`);
  }

  // Handle subscription cancelled
  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const customerId = sub.customer;

    try {
      const customer = await stripe.customers.retrieve(customerId);
      const email = (customer.email || '').toLowerCase();
      if (email) {
        await db.collection('users').doc(email).set({
          plan: 'free',
          status: 'cancelled',
          cancelledAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        console.log(`❌ ${email} → free (cancelled)`);
      }
    } catch (e) { console.error('Error handling cancellation:', e); }
  }

  // Handle payment failed
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const email = (invoice.customer_email || '').toLowerCase();
    if (email) {
      await db.collection('users').doc(email).set({
        status: 'past_due',
        lastFailedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      console.log(`⚠️ ${email} → payment failed`);
    }
  }

  res.status(200).json({ received: true });
});
