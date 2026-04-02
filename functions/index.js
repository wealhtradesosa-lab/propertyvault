const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

const detectPlan = (amount) => (amount === 2100 || amount === 19200) ? 'pro' : 'starter';
const detectCycle = (interval) => interval === 'year' ? 'annual' : 'monthly';

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

  const getEmailFromCustomer = async (customerId) => {
    try { const c = await stripe.customers.retrieve(customerId); return (c.email||'').toLowerCase(); }
    catch(e) { return ''; }
  };

  const getSubDetails = async (subId) => {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      const item = sub.items?.data?.[0]?.price;
      return { plan: detectPlan(item?.unit_amount||0), cycle: detectCycle(item?.recurring?.interval||'month'), status: sub.status };
    } catch(e) { return { plan: 'starter', cycle: 'monthly', status: 'active' }; }
  };

  try {
    switch(event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = (session.customer_details?.email || session.customer_email || '').toLowerCase();
        if (!email) break;
        const details = session.subscription ? await getSubDetails(session.subscription) : { plan: 'starter', cycle: 'monthly', status: 'active' };
        await db.collection('users').doc(email).set({
          ...details, email, stripeCustomerId: session.customer || '',
          stripeSubscriptionId: session.subscription || '',
          paidAt: admin.firestore.FieldValue.serverTimestamp(), status: 'active'
        }, { merge: true });
        console.log('checkout.completed:', email, details.plan, details.cycle);
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const email = await getEmailFromCustomer(sub.customer);
        if (!email) break;
        const item = sub.items?.data?.[0]?.price;
        const plan = detectPlan(item?.unit_amount||0);
        const cycle = detectCycle(item?.recurring?.interval||'month');
        const status = sub.status === 'active' ? 'active' : sub.status === 'past_due' ? 'past_due' : sub.status;
        await db.collection('users').doc(email).set({ plan, cycle, status, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log('subscription.updated:', email, plan, cycle, status);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const email = await getEmailFromCustomer(sub.customer);
        if (email) await db.collection('users').doc(email).set({ plan: 'free', status: 'cancelled', cancelledAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log('subscription.deleted:', email);
        break;
      }
      case 'invoice.payment_failed': {
        const email = (event.data.object.customer_email || '').toLowerCase();
        if (email) await db.collection('users').doc(email).set({ status: 'past_due', lastFailedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log('payment.failed:', email);
        break;
      }
      case 'invoice.paid': {
        const email = (event.data.object.customer_email || '').toLowerCase();
        if (email) await db.collection('users').doc(email).set({ status: 'active', lastPaidAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        console.log('invoice.paid:', email);
        break;
      }
    }
  } catch(e) { console.error('Webhook handler error:', e); }

  res.status(200).json({ received: true });
});
