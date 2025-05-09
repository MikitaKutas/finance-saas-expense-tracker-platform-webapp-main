import { z } from 'zod';
import { Hono } from 'hono';
import { createId } from '@paralleldrive/cuid2';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import { zValidator } from '@hono/zod-validator';
import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db/drizzle';
import { transactions, accounts, categories } from '@/db/schema';

const transferSchema = z.object({
  fromAccountId: z.string(),
  toAccountId: z.string(),
  amount: z.number().positive(),
  date: z.string(),
  notes: z.string().optional(),
});

const app = new Hono()
  .post(
    '/',
    clerkMiddleware(),
    zValidator('json', transferSchema),
    async (c) => {
      const auth = getAuth(c);
      const values = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      if (values.fromAccountId === values.toAccountId) {
        return c.json({ 
          error: 'Счет отправителя и получателя должны быть разными' 
        }, 400);
      }

      const [fromAccount] = await db
        .select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, auth.userId),
            eq(accounts.id, values.fromAccountId)
          )
        );

      const [toAccount] = await db
        .select({ id: accounts.id, name: accounts.name })
        .from(accounts)
        .where(
          and(
            eq(accounts.userId, auth.userId),
            eq(accounts.id, values.toAccountId)
          )
        );

      if (!fromAccount || !toAccount) {
        return c.json({ error: 'Один или оба счета не принадлежат пользователю' }, 400);
      }

      const transactionDate = new Date(values.date);

      try {
        let [withdrawalCategory] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.userId, auth.userId),
              eq(categories.name, 'Перевод на другой счет')
            )
          );

        if (!withdrawalCategory) {
          [withdrawalCategory] = await db
            .insert(categories)
            .values({
              id: createId(),
              name: 'Перевод на другой счет',
              userId: auth.userId,
            })
            .returning({ id: categories.id });
        }

        let [depositCategory] = await db
          .select({ id: categories.id })
          .from(categories)
          .where(
            and(
              eq(categories.userId, auth.userId),
              eq(categories.name, 'Перевод с другого счета')
            )
          );

        if (!depositCategory) {
          [depositCategory] = await db
            .insert(categories)
            .values({
              id: createId(),
              name: 'Перевод с другого счета',
              userId: auth.userId,
            })
            .returning({ id: categories.id });
        }

        const withdrawalId = createId();
        await db
          .insert(transactions)
          .values({
            id: withdrawalId,
            amount: -values.amount,
            payee: `Перевод на счет "${toAccount.name}"`,
            notes: values.notes ? `${values.notes} (перевод)` : 'Перевод между счетами',
            date: transactionDate,
            accountId: values.fromAccountId,
            categoryId: withdrawalCategory.id,
          });

        const depositId = createId();
        await db
          .insert(transactions)
          .values({
            id: depositId,
            amount: values.amount,
            payee: `Перевод со счета "${fromAccount.name}"`,
            notes: values.notes ? `${values.notes} (перевод)` : 'Перевод между счетами',
            date: transactionDate,
            accountId: values.toAccountId,
            categoryId: depositCategory.id,
          });

        await db
          .update(accounts)
          .set({
            amount: sql`${accounts.amount} - ${values.amount}`,
          })
          .where(eq(accounts.id, values.fromAccountId));

        await db
          .update(accounts)
          .set({
            amount: sql`${accounts.amount} + ${values.amount}`,
          })
          .where(eq(accounts.id, values.toAccountId));

        return c.json({ 
          data: { 
            withdrawalId,
            depositId 
          } 
        });
      } catch (error) {
        console.error('Ошибка при создании перевода:', error);
        return c.json({ 
          error: error instanceof Error ? error.message : 'Неизвестная ошибка'
        }, 500);
      }
    }
  );

export default app; 