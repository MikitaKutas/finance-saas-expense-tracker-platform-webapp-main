import { z } from 'zod';
import { and, eq, gte, lte } from 'drizzle-orm';
import { Hono } from 'hono';
import { createId } from '@paralleldrive/cuid2';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';

import { db } from '@/db/drizzle';
import { plans, subscriptions, accounts, transactions } from '@/db/schema';
import { getFinancialAdvice } from '@/lib/openai';

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
  )
  .get('/advice', clerkMiddleware(), async (c) => {
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

    const { from, to } = c.req.query();
    if (!from || !to) {
      return c.json({ error: 'Missing date range' }, 400);
    }

    const [plansList, transactionsList] = await Promise.all([
      db
        .select({
          type: plans.type,
          amount: plans.amount,
          month: plans.month,
          account: {
            name: accounts.name,
          },
        })
        .from(plans)
        .innerJoin(accounts, eq(plans.accountId, accounts.id))
        .where(eq(plans.userId, auth.userId)),
      db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          payee: transactions.payee,
          date: transactions.date,
          categoryId: transactions.categoryId,
          notes: transactions.notes,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(accounts.userId, auth.userId),
            gte(transactions.date, new Date(from)),
            lte(transactions.date, new Date(to))
          )
        ),
    ]);

    const formattedTransactions = transactionsList.map(t => ({
      id: t.id,
      amount: t.amount,
      payee: t.payee,
      date: t.date.toISOString(),
      category: t.categoryId,
      notes: t.notes
    }));

    const advice = await getFinancialAdvice(formattedTransactions, plansList);
    return c.json({ data: advice });
  });

export default app; 