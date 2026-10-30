const functions = require('firebase-functions');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Вспомогательная функция — получаем все скидки из Firestore
async function getDeals(city) {
  const snap = await db.collection('deals').get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => !d.isHidden)
    .filter(d => !city || city === 'Все' || d.city === city);
}

// 1. AI Chat — поиск по запросу
exports.aiChat = functions.https.onCall(async (data) => {
  const { message, city } = data;
  if (!message) throw new functions.https.HttpsError('invalid-argument', 'Message required');

  try {
    const deals = await getDeals(city);
    const dealsContext = deals.slice(0, 100).map(d =>
      `ID:${d.id}|${d.title}|${d.category}|${d.newPrice}₸|скидка:${d.discount}%|магазин:${d.store}|город:${d.city}`
    ).join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Ты AI-ассистент приложения O-GO — агрегатора скидок Казахстана.

Запрос пользователя: "${message}"
Город пользователя: ${city || 'не указан'}

Доступные товары в каталоге:
${dealsContext}

Задача:
1. Пойми что ищет пользователь (категория, бюджет, предпочтения)
2. Найди подходящие товары из каталога выше
3. Верни ответ ТОЛЬКО в JSON формате:
{
  "reply": "текст ответа пользователю на русском",
  "dealIds": ["id1", "id2", "id3"]
}

Правила:
- dealIds — только ID товаров из каталога выше которые подходят запросу
- Если ничего не найдено — dealIds: []
- Не придумывай товары которых нет в каталоге
- Учитывай бюджет если указан
- Отвечай на том языке на котором написан запрос`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const foundDeals = deals.filter(d => parsed.dealIds?.includes(d.id));
    return { reply: parsed.reply, deals: foundDeals };
  } catch (e) {
    throw new functions.https.HttpsError('internal', e.message);
  }
});

// 2. Smart Price Comparison
exports.comparePrice = functions.https.onCall(async (data) => {
  const { query, city } = data;
  if (!query) throw new functions.https.HttpsError('invalid-argument', 'Query required');

  try {
    const deals = await getDeals(city);
    const dealsContext = deals.map(d =>
      `ID:${d.id}|${d.title}|${d.category}|${d.newPrice}₸|${d.oldPrice}₸|скидка:${d.discount}%|магазин:${d.store}|город:${d.city}|описание:${d.description || ''}`
    ).join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Ты AI-ассистент для сравнения цен в приложении O-GO.

Пользователь ищет: "${query}"

Все товары в каталоге:
${dealsContext}

Найди товары которые являются ОДНИМ И ТЕМ ЖЕ товаром у разных продавцов (одинаковый бренд, модель, характеристики).
НЕ включай просто похожие товары — только идентичные.

Верни ТОЛЬКО JSON:
{
  "summary": "краткое описание что нашёл",
  "dealIds": ["id1", "id2"]
}

dealIds отсортируй по цене от дешёвого к дорогому.
Если одинаковых товаров нет — верни dealIds: [] и объясни в summary.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const foundDeals = deals
      .filter(d => parsed.dealIds?.includes(d.id))
      .sort((a, b) => Number(a.newPrice) - Number(b.newPrice));

    return { summary: parsed.summary, deals: foundDeals };
  } catch (e) {
    throw new functions.https.HttpsError('internal', e.message);
  }
});

// 3. Smart Shopping List
exports.analyzeShoppingList = functions.https.onCall(async (data) => {
  const { items, budget, city } = data;
  if (!items || !budget) throw new functions.https.HttpsError('invalid-argument', 'Items and budget required');

  try {
    const deals = await getDeals(city);
    const dealsContext = deals.map(d =>
      `ID:${d.id}|${d.title}|${d.category}|${d.newPrice}₸|скидка:${d.discount}%|магазин:${d.store}`
    ).join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `Ты AI-ассистент для умного списка покупок в приложении O-GO Казахстан.

Список покупок пользователя: ${items.join(', ')}
Бюджет: ${budget} ₸
Город: ${city || 'не указан'}

Доступные товары:
${dealsContext}

Для КАЖДОГО пункта из списка найди САМЫЙ ДЕШЁВЫЙ подходящий товар из каталога.
Посчитай общую сумму.

Верни ТОЛЬКО JSON:
{
  "analysis": "общий анализ — укладывается ли в бюджет",
  "totalMin": 12345,
  "withinBudget": true,
  "recommendations": [
    {
      "item": "название из списка пользователя",
      "dealId": "id товара или null если не найдено",
      "reason": "почему этот товар подходит"
    }
  ],
  "alternatives": "совет если бюджет превышен"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const recommendations = parsed.recommendations.map((rec) => ({
      ...rec,
      deal: rec.dealId ? deals.find(d => d.id === rec.dealId) || null : null,
    }));

    return {
      analysis: parsed.analysis,
      totalMin: parsed.totalMin,
      withinBudget: parsed.withinBudget,
      recommendations,
      alternatives: parsed.alternatives,
    };
  } catch (e) {
    throw new functions.https.HttpsError('internal', e.message);
  }
});

// 4. AI Visual Search
exports.visualSearch = functions.https.onCall(async (data) => {
  const { imageBase64, city } = data;
  if (!imageBase64) throw new functions.https.HttpsError('invalid-argument', 'Image required');

  try {
    const deals = await getDeals(city);
    const dealsContext = deals.map(d =>
      `ID:${d.id}|${d.title}|${d.category}|${d.newPrice}₸|скидка:${d.discount}%|магазин:${d.store}`
    ).join('\n');

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `Ты AI-ассистент для визуального поиска товаров в приложении O-GO Казахстан.

Проанализируй изображение и:
1. Определи что изображено (тип товара, бренд если виден, цвет, стиль)
2. Найди похожие товары в каталоге ниже

Каталог товаров:
${dealsContext}

Верни ТОЛЬКО JSON:
{
  "detected": "что обнаружено на фото",
  "category": "категория товара",
  "dealIds": ["id1", "id2", "id3"]
}

dealIds — ID похожих товаров из каталога. Максимум 6.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      },
    ]);

    const text = result.response.text();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    const foundDeals = deals.filter(d => parsed.dealIds?.includes(d.id));
    return {
      detected: parsed.detected,
      category: parsed.category,
      deals: foundDeals,
    };
  } catch (e) {
    throw new functions.https.HttpsError('internal', e.message);
  }
});
