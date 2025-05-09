import { z } from 'zod';
import { Hono } from 'hono';
import { createId } from '@paralleldrive/cuid2';
import { and, eq, isNotNull } from 'drizzle-orm';
import { zValidator } from '@hono/zod-validator';
import { clerkMiddleware, getAuth } from '@hono/clerk-auth';
import {
  Configuration,
  CountryCode,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from 'plaid';

import { db } from '@/db/drizzle';
import {
  accounts,
  categories,
  connectedBanks,
  transactions,
} from '@/db/schema';
import { convertAmountToMilliUnits } from '@/lib/utils';
import { translateCategories } from '@/lib/openai';

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_TOKEN,
      'PLAID-SECRET': process.env.PLAID_SECRET_TOKEN,
    },
  },
});

const client = new PlaidApi(configuration);

const app = new Hono()
  .get('/connected-bank', clerkMiddleware(), async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const [connectedBank] = await db
      .select()
      .from(connectedBanks)
      .where(eq(connectedBanks.userId, auth.userId));

    return c.json({ data: connectedBank || null });
  })
  .delete('/connected-bank', clerkMiddleware(), async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const [connectedBank] = await db
      .delete(connectedBanks)
      .where(eq(connectedBanks.userId, auth.userId))
      .returning({ id: connectedBanks.id });

    if (!connectedBank) {
      return c.json({ error: 'Not found' }, 404);
    }

    await db
      .delete(accounts)
      .where(
        and(eq(accounts.userId, auth.userId), isNotNull(accounts.plaidId))
      );

    await db
      .delete(categories)
      .where(
        and(eq(categories.userId, auth.userId), isNotNull(categories.plaidId))
      );

    return c.json({ data: connectedBank });
  })
  .post('/create-link-token', clerkMiddleware(), async (c) => {
    const auth = getAuth(c);
    if (!auth?.userId) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = await client.linkTokenCreate({
      user: {
        client_user_id: auth.userId,
      },
      client_name: 'Finance SASS Webapp',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    });

    return c.json({ data: token.data.link_token }, 200);
  })
  .post(
    '/exchange-public-token',
    clerkMiddleware(),
    // Modify our params so that it accepts public_token
    zValidator('json', z.object({ publicToken: z.string() })),
    async (c) => {
      const auth = getAuth(c);
      const { publicToken } = c.req.valid('json');

      if (!auth?.userId) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const exchange = await client.itemPublicTokenExchange({
        public_token: publicToken,
      });

      const [connectedBank] = await db
        .insert(connectedBanks)
        .values({
          id: createId(),
          userId: auth.userId,
          accessToken: exchange.data.access_token,
        })
        .returning();

      const plaidTransactions = await client.transactionsSync({
        access_token: connectedBank.accessToken,
      });

      console.log('Получены данные из Plaid:');
      console.log(`- Добавленные транзакции: ${plaidTransactions.data.added.length}`);

      const plaidAccounts = await client.accountsGet({
        access_token: connectedBank.accessToken,
      });

      console.log(`Получено ${plaidAccounts.data.accounts.length} счетов из Plaid`);

      const plaidCategories = await client.categoriesGet({});
      
      const categoryHierarchies = plaidCategories.data.categories.map(
        category => category.hierarchy.join(', ')
      );
      
      let translatedHierarchies: string[] = [];
      try {
        translatedHierarchies = await translateCategories(categoryHierarchies);
        console.log(`Успешно переведено ${translatedHierarchies.length} из ${categoryHierarchies.length} категорий`);
      } catch (error) {
        console.error("Ошибка при переводе категорий:", error);
        translatedHierarchies = categoryHierarchies;
      }

      const newAccounts = await db
        .insert(accounts)
        .values(
          plaidAccounts.data.accounts.map((account) => ({
            id: createId(),
            name: account.name,
            plaidId: account.account_id,
            userId: auth.userId,
            amount: convertAmountToMilliUnits(account.balances.current || 0),
          }))
        )
        .returning();

      const newCategories = await db
        .insert(categories)
        .values(
          plaidCategories.data.categories.map((category, index) => ({
            id: createId(),
            name: translatedHierarchies[index] || category.hierarchy.join(', '),
            plaidId: category.category_id,
            userId: auth.userId,
          }))
        )
        .returning();

      const newTransactionsValues = plaidTransactions.data.added.reduce(
        (acc, transaction) => {
          const account = newAccounts.find(
            (account) => account.plaidId === transaction.account_id
          );

          const category = newCategories.find(
            (category) => category.plaidId === transaction.category_id
          );

          if (!account) {
            console.log(`Не найден соответствующий счет для транзакции ${transaction.transaction_id}, account_id: ${transaction.account_id}`);
            return acc;
          }

          if (typeof transaction.amount !== 'number') {
            console.log(`Некорректный формат суммы для транзакции ${transaction.transaction_id}: ${transaction.amount} (тип: ${typeof transaction.amount})`);
            return acc;
          }

          const amountInMiliunits = convertAmountToMilliUnits(
            transaction.amount
          );

          let transactionDate;
          try {
            transactionDate = new Date(transaction.date);
            if (isNaN(transactionDate.getTime())) {
              throw new Error("Некорректная дата");
            }
          } catch (e) {
            console.log(`Некорректный формат даты для транзакции ${transaction.transaction_id}: ${transaction.date}`);
            transactionDate = new Date();
          }

          console.log(`Обработка транзакции: ${transaction.name}, сумма: ${transaction.amount}, счет: ${transaction.account_id} -> ${account.id}`);
          
          acc.push({
            id: createId(),
            amount: amountInMiliunits,
            payee: transaction.merchant_name || transaction.name,
            notes: transaction.name,
            date: transactionDate,
            accountId: account.id,
            categoryId: category?.id,
          });
          
          return acc;
        },
        [] as (typeof transactions.$inferInsert)[]
      );

      console.log(`Найдено ${plaidTransactions.data.added.length} транзакций в Plaid`);
      console.log(`Сформировано ${newTransactionsValues.length} транзакций для добавления`);

      if (newTransactionsValues.length > 0) {
        const validTransactions = newTransactionsValues.filter(transaction => {
          if (!transaction.accountId || !transaction.payee || !transaction.date) {
            console.log(`Пропускаем транзакцию с неполными данными: ${JSON.stringify(transaction)}`);
            return false;
          }
          
          if (typeof transaction.amount !== 'number') {
            console.log(`Пропускаем транзакцию с некорректной суммой: ${JSON.stringify(transaction)}`);
            return false;
          }
          
          return true;
        });
        
        console.log(`Валидных транзакций: ${validTransactions.length} из ${newTransactionsValues.length}`);
        
        const batchSize = 100;
        const batches = [];
        
        for (let i = 0; i < validTransactions.length; i += batchSize) {
          batches.push(validTransactions.slice(i, i + batchSize));
        }
        
        try {
          console.log('Начинаем вставку транзакций в БД...');
          
          for (let i = 0; i < batches.length; i++) {
            console.log(`Вставка пакета ${i+1}/${batches.length} (${batches[i].length} транзакций)...`);
            await db.insert(transactions).values(batches[i]);
          }
          
          console.log(`Успешно вставлено ${validTransactions.length} транзакций`);
        } catch (error) {
          console.error('Ошибка при вставке транзакций:', error);
          // Возвращаем ошибку клиенту, но продолжаем работу, так как счета и категории уже созданы
          return c.json({ 
            ok: true, 
            warning: "Успешно подключено к банку, но не удалось импортировать транзакции",
            error: error instanceof Error ? error.message : String(error)
          }, 200);
        }
      } else {
        console.log('Нет транзакций для добавления из Plaid');
      }

      return c.json({ ok: true }, 200);
    }
  );

export default app;
