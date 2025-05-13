import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';

import { db } from '@/db/drizzle';
import { stripe } from '@/lib/stripe';
import { subscriptions } from '@/db/schema';
import {APP_URL} from "@/lib/constants";

const app = new Hono()
  .get('/current', clerkMiddleware(), async (c) => {
    const auth =  getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, auth.userId));

    return c.json({ data: subscription || null });
  })
  .post('/checkout', clerkMiddleware(), async (c) => {
    const auth = getAuth(c);

    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const [existing] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, auth.userId));

    if (existing?.subscriptionId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: existing.customerId ?? '',
        return_url: `${APP_URL}/`,
        locale: 'ru',
      });

      return c.json({ data: portalSession.url });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/`,
      cancel_url: `${APP_URL}/`,
      metadata: {
        userId: auth.userId,
      },
      locale: 'ru',
    });

    return c.json({ data: checkoutSession.url });
  })
  .post('/webhook', async (c) => {
    const text = await c.req.text();
    const signature = c.req.header('stripe-signature');

    if (!signature) {
      return c.json({ error: 'No signature' }, 401);
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        text,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return c.json({ error: 'Webhook signature verification failed' }, 401);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const userId = session.metadata?.userId;
      
      if (userId && subscriptionId && customerId) {
        const [existing] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.subscriptionId, subscriptionId));

        if (!existing) {
          await db.insert(subscriptions).values({
            id: createId(),
            subscriptionId,
            customerId,
            userId,
            status: 'active',
          });
        }
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.subscriptionId, subscription.id));

      if (existing) {
        await db
          .update(subscriptions)
          .set({
            status: subscription.status,
          })
          .where(eq(subscriptions.subscriptionId, subscription.id));
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      
      const [existing] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.subscriptionId, subscription.id));

      if (existing) {
        await db
          .delete(subscriptions)
          .where(eq(subscriptions.subscriptionId, subscription.id));
      }
    }

    return c.json({}, 200);
  });

export default app;
