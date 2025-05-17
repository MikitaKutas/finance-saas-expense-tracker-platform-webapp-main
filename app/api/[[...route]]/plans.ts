import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { createId } from '@paralleldrive/cuid2';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';

import { db } from '@/db/drizzle';
import { plans, subscriptions, accounts } from '@/db/schema';

const app = new Hono()
  .get('/', clerkMiddleware(), async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, auth.userId));

    if (!subscription || subscription.status !== 'active') {
      return c.json({ error: 'Subscription required' }, 403);
    }

    const data = await db
      .select({
        id: plans.id,
        type: plans.type,
        amount: plans.amount,
        month: plans.month,
        accountId: plans.accountId,
        account: {
          name: accounts.name,
        },
      })
      .from(plans)
      .innerJoin(accounts, eq(plans.accountId, accounts.id))
      .where(eq(plans.userId, auth.userId));

    return c.json({ data });
  })
  .post(
    '/',
    clerkMiddleware(),
    zValidator(
      'json',
      z.object({
        accountId: z.string(),
        type: z.enum(['savings', 'spending']),
        amount: z.number(),
        month: z.string().transform((str) => new Date(str).toISOString()),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, auth.userId));

      if (!subscription || subscription.status !== 'active') {
        return c.json({ error: 'Subscription required' }, 403);
      }

      const values = c.req.valid('json');

      const [data] = await db
        .insert(plans)
        .values({
          id: createId(),
          userId: auth.userId,
          ...values,
        })
        .returning();

      return c.json({ data });
    }
  )
  .patch(
    '/:id',
    clerkMiddleware(),
    zValidator(
      'param',
      z.object({
        id: z.string(),
      })
    ),
    zValidator(
      'json',
      z.object({
        accountId: z.string(),
        type: z.enum(['savings', 'spending']),
        amount: z.number(),
        month: z.string().transform((str) => new Date(str).toISOString()),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, auth.userId));

      if (!subscription || subscription.status !== 'active') {
        return c.json({ error: 'Subscription required' }, 403);
      }

      const { id } = c.req.valid('param');
      const values = c.req.valid('json');

      const [data] = await db
        .update(plans)
        .set(values)
        .where(and(eq(plans.id, id), eq(plans.userId, auth.userId)))
        .returning();

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  )
  .delete(
    '/:id',
    clerkMiddleware(),
    zValidator(
      'param',
      z.object({
        id: z.string(),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, auth.userId));

      if (!subscription || subscription.status !== 'active') {
        return c.json({ error: 'Subscription required' }, 403);
      }

      const { id } = c.req.valid('param');

      const [data] = await db
        .delete(plans)
        .where(and(eq(plans.id, id), eq(plans.userId, auth.userId)))
        .returning();

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  );

export default app; 