import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';

import { db } from '@/db/drizzle';
import { stripe } from '@/lib/stripe';
import { subscriptions } from '@/db/schema';

const app = new Hono()
  .get('/current', clerkMiddleware(), async (c) => {
    const auth = getAuth(c);
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
      // Если у пользователя уже есть подписка, создаем портал для управления ею
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: existing.customerId ?? '',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL!}/`,
      });

      return c.json({ data: portalSession.url });
    }

    // Создаем новую сессию для оформления подписки
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL!}/`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL!}/`,
      metadata: {
        userId: auth.userId,
      },
    });

    return c.json({ data: checkoutSession.url });
  })
  // Webhook для обработки событий от Stripe
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

    // Обработка событий от Stripe
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      // Создаем запись о подписке
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
          .update(subscriptions)
          .set({
            status: 'canceled',
          })
          .where(eq(subscriptions.subscriptionId, subscription.id));
      }
    }

    return c.json({}, 200);
  });

export default app;
