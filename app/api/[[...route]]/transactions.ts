import { z } from 'zod';
import { Hono } from 'hono';
import { parse, subDays } from 'date-fns';
import { createId } from '@paralleldrive/cuid2';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import {
  transactions,
  insertTransactionSchema,
  categories,
  accounts,
} from '@/db/schema';

// chain the handlers so that the types are always inferred
const app = new Hono()
  .get(
    '/',
    zValidator(
      'query',
      z.object({
        from: z.string().optional(),
        to: z.string().optional(),
        accountId: z.string().optional(),
      })
    ),
    clerkMiddleware(),
    async (c) => {
      // Get authenticated user
      const auth = getAuth(c);
      const { from, to, accountId } = c.req.valid('query');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // if none is passed, we will show the last dates transactions data
      const defaultTo = new Date();
      const defaultFrom = subDays(defaultTo, 30);

      const startDate = from
        ? parse(from, 'yyyy-MM-dd', new Date())
        : defaultFrom;

      const endDate = to ? parse(to, 'yyyy-MM-dd', new Date()) : defaultTo;

      // select will return data which will be array
      const data = await db
        .select({
          id: transactions.id,
          category: categories.name,
          // we're doing categoryId so that we can find the category in the array of categories, because categoryName doesn't have to be unique so we need both
          categoryId: transactions.categoryId,
          date: transactions.date,
          payee: transactions.payee,
          amount: transactions.amount,
          notes: transactions.notes,
          account: accounts.name,
          accountId: transactions.accountId,
        })
        .from(transactions)
        // using innerJoin because both sides of the table relations exist & we don't want to load transactions which don't have accountId & account is required
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            accountId ? eq(transactions.accountId, accountId) : undefined,
            eq(accounts.userId, auth.userId),
            gte(transactions.date, startDate),
            lte(transactions.date, endDate)
          )
        )
        .orderBy(desc(transactions.date));

      return c.json({ data });
    }
  )
  .get(
    '/:id',
    zValidator(
      'param',
      z.object({
        id: z.string().optional(),
      })
    ),
    clerkMiddleware(),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');

      if (!id) {
        return c.json({ error: 'Bad Request: Missing id' }, 400);
      }

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [data] = await db
        .select({
          id: transactions.id,
          categoryId: transactions.categoryId,
          date: transactions.date,
          payee: transactions.payee,
          amount: transactions.amount,
          notes: transactions.notes,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  )
  .post(
    '/',
    clerkMiddleware(),
    // validate using zod what kind of json this POST request accepts by adding a validator zValidator
    zValidator(
      'json',
      insertTransactionSchema.omit({
        id: true,
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      // Inside the values we get the name
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [data] = await db
        .insert(transactions)
        .values({
          id: createId(),
          ...values,
        })
        .returning();

      await db
        .update(accounts)
        .set({
          amount: sql`${accounts.amount} + ${values.amount}`,
        })
        .where(eq(accounts.id, values.accountId));

      return c.json({ data });
    }
  )
  .post(
    '/bulk-create',
    clerkMiddleware(),
    zValidator(
      'json',
      z.array(
        insertTransactionSchema.omit({
          id: true,
        })
      )
    ),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const data = await db
        .insert(transactions)
        .values(
          values.map((value) => ({
            id: createId(),
            ...value,
          }))
        )
        .returning();

      const accountAmounts = values.reduce((acc, transaction) => {
        const { accountId, amount } = transaction;
        acc[accountId] = (acc[accountId] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);

      for (const [accountId, amount] of Object.entries(accountAmounts)) {
        await db
          .update(accounts)
          .set({
            amount: sql`${accounts.amount} + ${amount}`,
          })
          .where(eq(accounts.id, accountId));
      }

      return c.json({ data });
    }
  )
  // Bulk delete account API
  .post(
    '/bulk-delete',
    clerkMiddleware(),
    zValidator(
      'json',
      z.object({
        ids: z.array(z.string()),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const transactionsToAdjust = await db
        .select({
          id: transactions.id,
          accountId: transactions.accountId,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(inArray(transactions.id, values.ids));

      if (transactionsToAdjust.length === 0) {
        return c.json({ data: [] });
      }

      // Группируем транзакции по счетам
      const accountAmounts = transactionsToAdjust.reduce((acc, transaction) => {
        const { accountId, amount } = transaction;
        acc[accountId] = (acc[accountId] || 0) + amount;
        return acc;
      }, {} as Record<string, number>);

      // Обновляем балансы для каждого счета
      for (const [accountId, amount] of Object.entries(accountAmounts)) {
        await db
          .update(accounts)
          .set({
            amount: sql`${accounts.amount} - ${amount}`,
          })
          .where(eq(accounts.id, accountId));
      }

      // Выбираем идентификаторы транзакций для удаления
      const transactionsToDeleteIds = await db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            inArray(transactions.id, values.ids),
            eq(accounts.userId, auth.userId)
          )
        );
        
      const idsToDelete = transactionsToDeleteIds.map(t => t.id);
      
      const data = await db
        .delete(transactions)
        .where(inArray(transactions.id, idsToDelete))
        .returning({
          id: transactions.id,
        });

      return c.json({ data });
    }
  )
  .patch(
    '/:id',
    clerkMiddleware(),
    // Chaining two validators - first the id to patch & second one the json obj
    zValidator(
      'param',
      z.object({
        id: z.string().optional(),
      })
    ),
    zValidator(
      'json',
      insertTransactionSchema.omit({
        id: true,
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');
      const values = c.req.valid('json');

      if (!id) {
        return c.json({ error: 'Bad Request: Missing id' }, 400);
      }

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [currentTransaction] = await db
        .select({
          accountId: transactions.accountId,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(eq(transactions.id, id));

      if (!currentTransaction) {
        return c.json({ error: 'Not found' }, 404);
      }

      const amountDifference = values.amount - currentTransaction.amount;
      
      if (currentTransaction.accountId !== values.accountId) {
        await db
          .update(accounts)
          .set({
            amount: sql`${accounts.amount} - ${currentTransaction.amount}`,
          })
          .where(eq(accounts.id, currentTransaction.accountId));
        
        await db
          .update(accounts)
          .set({
            amount: sql`${accounts.amount} + ${values.amount}`,
          })
          .where(eq(accounts.id, values.accountId));
      } else {
        await db
          .update(accounts)
          .set({
            amount: sql`${accounts.amount} + ${amountDifference}`,
          })
          .where(eq(accounts.id, values.accountId));
      }

      const transactionIds = await db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));
      
      if (transactionIds.length === 0) {
        return c.json({ error: 'Not found' }, 404);
      }
      
      const [data] = await db
        .update(transactions)
        .set(values)
        .where(eq(transactions.id, id))
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
        id: z.string().optional(),
      })
    ),
    async (c) => {
      const auth = getAuth(c);
      const { id } = c.req.valid('param');

      if (!id) {
        return c.json({ error: 'Bad Request: Missing id' }, 400);
      }

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const [transactionToDelete] = await db
        .select({
          accountId: transactions.accountId,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(eq(transactions.id, id));

      if (!transactionToDelete) {
        return c.json({ error: 'Not found' }, 404);
      }

      await db
        .update(accounts)
        .set({
          amount: sql`${accounts.amount} - ${transactionToDelete.amount}`,
        })
        .where(eq(accounts.id, transactionToDelete.accountId));

      const transactionIdsToDelete = await db
        .select({ id: transactions.id })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(and(eq(transactions.id, id), eq(accounts.userId, auth.userId)));
      
      if (transactionIdsToDelete.length === 0) {
        return c.json({ error: 'Not found' }, 404);
      }

      const [data] = await db
        .delete(transactions)
        .where(eq(transactions.id, id))
        .returning({ id: transactions.id });

      if (!data) {
        return c.json({ error: 'Not found' }, 404);
      }

      return c.json({ data });
    }
  );

export default app;
