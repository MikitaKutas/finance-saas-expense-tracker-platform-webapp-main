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