import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  console.warn("Внимание: OPENAI_API_KEY не задан. Интеграция перевода с OpenAI не будет работать.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function translateCategories(categories: string[]): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY || categories.length === 0) {
    return categories;
  }

  const batchSize = 100;
  const batches: string[][] = [];
  
  for (let i = 0; i < categories.length; i += batchSize) {
    batches.push(categories.slice(i, i + batchSize));
  }
  
  console.log(`Разделяем ${categories.length} категорий на ${batches.length} батчей`);
  
  const results: string[] = [];
  
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`Обработка батча ${i + 1}/${batches.length}, размер: ${batch.length}`);
    
    const translatedBatch = await translateCategoryBatch(batch);
    results.push(...translatedBatch);
  }
  
  return results;
}

async function translateCategoryBatch(categories: string[]): Promise<string[]> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Ты переводчик финансовых категорий с английского на русский. Отвечай только в формате JSON с массивом переводов."
        },
        {
          role: "user",
          content: `Переведи следующие финансовые категории на русский язык. Ответь строго в формате JSON: { "translations": [строка1, строка2, ...] } без дополнительного текста:\n${JSON.stringify(categories)}`
        }
      ],
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      console.error("OpenAI вернул пустой результат");
      return categories;
    }

    try {
      const cleanedResult = result.trim();
      const parsedResult = JSON.parse(cleanedResult);
      
      if (Array.isArray(parsedResult.translations)) {
        if (parsedResult.translations.length === categories.length) {
          return parsedResult.translations;
        } else {
          console.warn(`Количество переведенных категорий (${parsedResult.translations.length}) не соответствует исходному количеству (${categories.length})`);
          return categories.map((cat, index) =>
            index < parsedResult.translations.length ? parsedResult.translations[index] : cat
          );
        }
      }
      
      console.error("Неправильный формат ответа от OpenAI:", parsedResult);
      return categories;
    } catch (error) {
      console.error("Ошибка при парсинге ответа OpenAI:", error);
      
      return categories;
    }
  } catch (error) {
    console.error("Ошибка при обращении к OpenAI API:", error);
    return categories;
  }
}

type Transaction = {
  id: string;
  amount: number;
  payee: string;
  date: string;
  category: string | null;
  notes: string | null;
};

type SubscriptionAnalysis = {
  hasSubscriptions: boolean;
  subscriptions: {
    description: string;
    amount: number;
    frequency: string;
  }[];
  message: string;
};

export async function analyzeSubscriptions(transactions: Transaction[]): Promise<SubscriptionAnalysis> {
  if (!process.env.OPENAI_API_KEY || transactions.length === 0) {
    return { hasSubscriptions: false, subscriptions: [], message: '' };
  }

  try {
    const prompt = `
      Проанализируй следующие транзакции и определи, какие из них являются регулярными подписками (ежемесячными, еженедельными или ежедневными).
      Для каждой подписки укажи её описание, сумму и частоту.
      Если подписок нет, верни hasSubscriptions: false.
      
      Важно: суммы в транзакциях указаны в центах (копейках). Например, сумма 2500 означает $25.00.
      
      Транзакции:
      ${JSON.stringify(transactions, null, 2)}
      
      Верни ответ в формате JSON:
      {
        "hasSubscriptions": boolean,
        "subscriptions": [
          {
            "description": string,
            "amount": number, // сумма в центах (копейках)
            "frequency": "monthly" | "weekly" | "daily"
          }
        ],
        "message": string
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `Ты - дружелюбный финансовый аналитик-помощник. Твоя задача - помочь пользователю отслеживать его регулярные подписки и предупреждать о предстоящих списаниях.
                    
                    При анализе подписок:
                    1. Обрати внимание на регулярные платежи с одинаковыми суммами
                    2. Определи частоту платежей (ежемесячно, еженедельно, ежедневно)
                    3. Составь понятное описание каждой подписки
                    4. В сообщении укажи, что это предупреждение о предстоящих списаниях
                    5. Напомни, что подписки можно отменить, если они больше не нужны
                    6. Используй дружелюбный, но профессиональный тон
                    7. Помни, что суммы в транзакциях указаны в центах (копейках)
                    8. Все, кроме названий компаний, должно быть на русском, если названия компаний не на русском
                    
                    Формат сообщения должен быть примерно таким:
                    "Я заметил несколько регулярных подписок, которые скоро будут автоматически списаны. Если какие-то из них вам больше не нужны, рекомендую отменить их заранее. Вот список ваших активных подписок:"
                    
                    В сообщении НЕ нужно перечислять сами подписки - они будут отображены отдельно в списке ниже.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("OpenAI вернул пустой результат");
    }

    return JSON.parse(result);
  } catch (error) {
    console.error("Ошибка при анализе подписок:", error);
    return { hasSubscriptions: false, subscriptions: [], message: '' };
  }
}

type FinancialAdvice = {
  message: string;
  shortTermAdvice: string;
  longTermAdvice: string | null;
  isCritical: boolean;
};

export async function getFinancialAdvice(
  transactions: Transaction[],
  plans: {
    type: 'savings' | 'spending';
    amount: number;
    month: string;
    account: {
      name: string;
    };
  }[]
): Promise<FinancialAdvice> {
  if (!process.env.OPENAI_API_KEY || transactions.length === 0) {
    return {
      message: '',
      shortTermAdvice: '',
      longTermAdvice: null,
      isCritical: false
    };
  }

  try {
    const prompt = `
      Проанализируй следующие транзакции и планы пользователя, чтобы дать финансовый совет.
      
      Транзакции:
      ${JSON.stringify(transactions, null, 2)}
      
      Планы:
      ${JSON.stringify(plans, null, 2)}
      
      Важно: все суммы в транзакциях и планах указаны в центах. Например, сумма 2500 означает $25.00.
      В своих рекомендациях используй суммы в центах, добавляя слово "центов" после числа.
      Например: "рекомендую отложить 5000 центов" вместо "$50.00".
      
      Верни ответ в формате JSON:
      {
        "message": string, // общее сообщение о текущей финансовой ситуации
        "shortTermAdvice": string, // конкретные рекомендации на текущий месяц
        "longTermAdvice": string | null, // рекомендации на долгосрочную перспективу, если есть серьезные проблемы
        "isCritical": boolean // true, если ситуация критическая и требует немедленного внимания
      }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `Ты - опытный финансовый аналитик-консультант. Твоя задача - проанализировать финансовую ситуацию пользователя и дать полезные рекомендации.

При анализе:
1. Оцени текущую финансовую ситуацию
2. Сравни планы с реальными тратами
3. Определи, есть ли риски невыполнения планов
4. Если проблемы серьезные и не могут быть решены в текущем месяце, предложи долгосрочную стратегию
5. Давай конкретные, практические советы
6. Используй дружелюбный, но профессиональный тон
7. Все, кроме названий компаний, должно быть на русском
8. Все суммы указывай в центах, добавляя слово "центов" после числа
9. Помни, что суммы в транзакциях указаны в центах

Формат сообщения должен быть примерно таким:
"На основе анализа ваших транзакций и планов, я вижу следующие моменты: [краткое описание ситуации]. Вот мои рекомендации на текущий месяц: [конкретные советы]. [Если есть серьезные проблемы, добавь рекомендации на долгосрочную перспективу]."`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0]?.message?.content;
    if (!result) {
      throw new Error("OpenAI вернул пустой результат");
    }

    return JSON.parse(result);
  } catch (error) {
    console.error("Ошибка при получении финансового совета:", error);
    return {
      message: '',
      shortTermAdvice: '',
      longTermAdvice: null,
      isCritical: false
    };
  }
}