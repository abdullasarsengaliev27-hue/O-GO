import { useState, useRef, useEffect } from 'react';
import type React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';
import * as ImagePicker from 'expo-image-picker';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = 'YOUR_API_KEY_HERE';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const QUICK_PROMPTS = [
  '👟 Найди кроссовки до 20 000 ₸',
  '👗 Платье на лето до 15 000 ₸',
  '📱 Смартфон до 150 000 ₸',
  '💄 Косметика до 5 000 ₸',
  '🍕 Еда со скидкой рядом',
];

export function AIScreen({ user, userCity }: { user: User | null, userCity?: string | null }) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<any[]>([
    {
      id: '1',
      role: 'assistant',
      type: 'text',
      text: `Привет! 👋 Я AI Shopping Assistant O-GO.\n\nЯ помогу тебе:\n🔍 Найти товары по описанию\n💰 Сравнить цены в магазинах\n🛒 Составить список покупок по бюджету\n📸 Найти похожие товары по фото\n\nЧто ищешь?`,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [deals, setDeals] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'compare' | 'list' | 'visual'>('chat');
  const [budget, setBudget] = useState('');
  const [shoppingList, setShoppingList] = useState('');
  const [compareQuery, setCompareQuery] = useState('');
  const [visualImage, setVisualImage] = useState<string | null>(null);
  const [visualImageBase64, setVisualImageBase64] = useState<string | null>(null);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'deals'), snap => {
      setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((d: any) => !d.isHidden));
    });
  }, []);

  const getDealsContext = (maxDeals = 100) => {
    return deals
      .filter(d => !userCity || userCity === 'Все' || (d as any).city === userCity)
      .slice(0, maxDeals)
      .map((d: any) =>
        `ID:${d.id}|${d.title}|${d.category}|цена:${d.newPrice}₸|скидка:${d.discount}%|магазин:${d.store}|город:${d.city}|описание:${d.description || ''}`
      ).join('\n');
  };

  const callGemini = async (prompt: string): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    return result.response.text();
  };

  const callGeminiWithImage = async (prompt: string, base64: string): Promise<string> => {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent([
      prompt,
      { inlineData: { mimeType: 'image/jpeg', data: base64.replace(/^data:image\/\w+;base64,/, '') } },
    ]);
    return result.response.text();
  };

  const parseJSON = (text: string) => {
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), role: 'user', type: 'text', text: messageText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const dealsContext = getDealsContext(80);
      const prompt = `Ты AI-ассистент приложения O-GO — агрегатора скидок Казахстана.

Запрос пользователя: "${messageText}"
Город пользователя: ${userCity || 'не указан'}

Доступные товары в каталоге:
${dealsContext}

Задача:
1. Пойми что ищет пользователь (категория, бюджет, предпочтения)
2. Найди подходящие товары из каталога
3. Верни ТОЛЬКО JSON без лишнего текста:
{
  "reply": "текст ответа пользователю",
  "dealIds": ["id1", "id2", "id3"]
}

Правила:
- dealIds — только реальные ID из каталога выше
- Учитывай бюджет если указан
- Если ничего не найдено — dealIds: [] и объясни в reply
- Не придумывай товары`;

      const responseText = await callGemini(prompt);
      const parsed = parseJSON(responseText);
      const foundDeals = deals.filter((d: any) => parsed.dealIds?.includes(d.id));

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        type: foundDeals.length > 0 ? 'deals' : 'text',
        text: parsed.reply,
        deals: foundDeals,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        type: 'text',
        text: '😔 Произошла ошибка. Попробуй ещё раз.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const compareProducts = async () => {
    if (!compareQuery.trim()) return Alert.alert('Введи название товара');
    setLoading(true);

    try {
      const dealsContext = getDealsContext(100);
      const prompt = `Ты AI-ассистент для сравнения цен в O-GO Казахстан.

Пользователь ищет: "${compareQuery}"

Все товары:
${dealsContext}

Найди товары которые являются ОДНИМ И ТЕМ ЖЕ товаром у разных продавцов.
НЕ включай просто похожие — только идентичные по бренду и модели.

Верни ТОЛЬКО JSON:
{
  "summary": "краткое описание результата",
  "dealIds": ["id1", "id2"]
}

dealIds отсортируй от дешёвого к дорогому.`;

      const responseText = await callGemini(prompt);
      const parsed = parseJSON(responseText);
      const foundDeals = deals
        .filter((d: any) => parsed.dealIds?.includes(d.id))
        .sort((a: any, b: any) => Number(a.newPrice) - Number(b.newPrice));

      const msgs = [
        { id: '1', role: 'assistant', type: 'text', text: 'Привет! 👋 Я AI Shopping Assistant O-GO.' },
        { id: '2', role: 'user', type: 'text', text: `Сравни цены: ${compareQuery}` },
        {
          id: '3',
          role: 'assistant',
          type: foundDeals.length > 0 ? 'compare' : 'text',
          text: parsed.summary,
          deals: foundDeals,
        },
      ];
      setMessages(msgs);
      setActiveTab('chat');
    } catch (e: any) {
      Alert.alert('Ошибка', 'Не удалось выполнить сравнение');
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const analyzeShoppingList = async () => {
    if (!shoppingList.trim() || !budget.trim()) return Alert.alert('Заполни список и бюджет');
    const budgetNum = parseInt(budget.replace(/\D/g, ''));
    const items = shoppingList.split('\n').filter(i => i.trim());
    setLoading(true);

    try {
      const dealsContext = getDealsContext(100);
      const prompt = `Ты AI-ассистент для умного списка покупок в O-GO Казахстан.

Список покупок: ${items.join(', ')}
Бюджет: ${budgetNum} ₸
Город: ${userCity || 'не указан'}

Доступные товары:
${dealsContext}

Для КАЖДОГО пункта найди САМЫЙ ДЕШЁВЫЙ подходящий товар.
Посчитай общую сумму реальных цен.

Верни ТОЛЬКО JSON:
{
  "analysis": "анализ — укладывается ли в бюджет",
  "totalMin": 12345,
  "withinBudget": true,
  "recommendations": [
    {
      "item": "название из списка",
      "dealId": "реальный id или null",
      "reason": "почему подходит"
    }
  ],
  "alternatives": "совет если бюджет превышен или null"
}`;

      const responseText = await callGemini(prompt);
      const parsed = parseJSON(responseText);
      const recommendations = parsed.recommendations.map((rec: any) => ({
        ...rec,
        deal: rec.dealId ? deals.find((d: any) => d.id === rec.dealId) || null : null,
      }));

      const msgs = [
        { id: '1', role: 'assistant', type: 'text', text: 'Привет! 👋 Я AI Shopping Assistant O-GO.' },
        { id: '2', role: 'user', type: 'text', text: `Список: ${items.join(', ')}\nБюджет: ${budgetNum.toLocaleString()} ₸` },
        {
          id: '3',
          role: 'assistant',
          type: 'shopping_list',
          text: parsed.analysis,
          recommendations,
          totalMin: parsed.totalMin,
          withinBudget: parsed.withinBudget,
          budget: budgetNum,
          alternatives: parsed.alternatives,
        },
      ];
      setMessages(msgs);
      setActiveTab('chat');
    } catch (e: any) {
      Alert.alert('Ошибка', 'Не удалось проанализировать список');
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }
  };

  const pickImageForSearch = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setVisualImage(uri);

      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      setVisualImageBase64(base64);

      const userMsg = {
        id: Date.now().toString(),
        role: 'user',
        type: 'image',
        text: 'Найди похожие товары по фото',
        image: uri,
      };
      setMessages(prev => [...prev, userMsg]);
      setActiveTab('chat');
      setLoading(true);

      try {
        const dealsContext = getDealsContext(100);
        const prompt = `Ты AI-ассистент для визуального поиска в O-GO Казахстан.

Проанализируй изображение:
1. Определи что изображено (тип товара, бренд, цвет, стиль)
2. Найди похожие товары в каталоге

Каталог:
${dealsContext}

Верни ТОЛЬКО JSON:
{
  "detected": "что обнаружено на фото",
  "category": "категория товара",
  "dealIds": ["id1", "id2", "id3"]
}

Максимум 6 dealIds из реального каталога.`;

        const responseText = await callGeminiWithImage(prompt, base64);
        const parsed = parseJSON(responseText);
        const foundDeals = deals.filter((d: any) => parsed.dealIds?.includes(d.id));

        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          type: foundDeals.length > 0 ? 'deals' : 'text',
          text: `🔍 Обнаружен: ${parsed.detected}\nКатегория: ${parsed.category}\n\n${foundDeals.length > 0 ? `Нашёл ${foundDeals.length} похожих товаров:` : 'Похожих товаров в каталоге не найдено'}`,
          deals: foundDeals,
        }]);
      } catch (e: any) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          type: 'text',
          text: '😔 Не удалось проанализировать фото. Попробуй ещё раз.',
        }]);
      } finally {
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
      }
    }
  };

  const renderMessage = (msg: any) => {
    const isUser = msg.role === 'user';
    return (
      <View key={msg.id} style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
          {!isUser && (
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 16 }}>🤖</Text>
            </View>
          )}
          <View style={{ maxWidth: '80%', backgroundColor: isUser ? '#FF4500' : '#fff', borderRadius: 18, borderBottomRightRadius: isUser ? 4 : 18, borderBottomLeftRadius: isUser ? 18 : 4, padding: 12, elevation: 2 }}>
            {msg.type === 'image' && msg.image && (
              <Image source={{ uri: msg.image }} style={{ width: 200, height: 200, borderRadius: 12, marginBottom: 8 }} resizeMode="cover" />
            )}
            <Text style={{ color: isUser ? '#fff' : '#1a1a1a', fontSize: 14, lineHeight: 20 }}>{msg.text}</Text>
          </View>
        </View>

        {msg.type === 'deals' && msg.deals?.length > 0 && (
          <View style={{ marginLeft: 40 }}>
            {msg.deals.map((deal: any) => (
              <DealCard key={deal.id} item={deal} user={user} />
            ))}
          </View>
        )}

        {msg.type === 'compare' && msg.deals?.length > 0 && (
          <View style={{ marginLeft: 40 }}>
            {msg.deals.map((deal: any, i: number) => (
              <View key={deal.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: i === 0 ? '#FFF0EB' : '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '900', color: i === 0 ? '#FF4500' : '#999', fontSize: 14 }}>#{i + 1}</Text>
                </View>
                {deal.imageUrl && <Image source={{ uri: deal.imageUrl }} style={{ width: 52, height: 52, borderRadius: 10 }} resizeMode="cover" />}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 14 }} numberOfLines={1}>{deal.title}</Text>
                  <Text style={{ color: '#999', fontSize: 12 }}>🏪 {deal.store} · 📍 {deal.city}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 16 }}>{Number(deal.newPrice).toLocaleString()} ₸</Text>
                  <Text style={{ color: '#aaa', fontSize: 11, textDecorationLine: 'line-through' }}>{Number(deal.oldPrice).toLocaleString()} ₸</Text>
                  <View style={{ backgroundColor: '#FFF0EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ color: '#FF4500', fontSize: 11, fontWeight: '700' }}>-{deal.discount}%</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {msg.type === 'shopping_list' && (
          <View style={{ marginLeft: 40 }}>
            {msg.recommendations?.map(({ item, deal, reason }: any, i: number) => (
              <View key={i} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, elevation: 2 }}>
                <Text style={{ color: '#999', fontSize: 11, marginBottom: 4 }}>📝 {item}</Text>
                {deal ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {deal.imageUrl && <Image source={{ uri: deal.imageUrl }} style={{ width: 44, height: 44, borderRadius: 10 }} resizeMode="cover" />}
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 13 }} numberOfLines={1}>{deal.title}</Text>
                      <Text style={{ color: '#FF4500', fontWeight: '700' }}>{Number(deal.newPrice).toLocaleString()} ₸ · -{deal.discount}%</Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: '#aaa', fontSize: 13 }}>Не найдено в каталоге</Text>
                )}
                {reason && <Text style={{ color: '#999', fontSize: 11, marginTop: 4 }}>{reason}</Text>}
              </View>
            ))}
            <View style={{ backgroundColor: msg.withinBudget ? '#E8F5E9' : '#FFEBEE', borderRadius: 14, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: msg.withinBudget ? '#2E7D32' : '#C62828' }}>
                {msg.withinBudget ? '✅ В бюджете!' : '⚠️ Превышение'}
              </Text>
              <Text style={{ fontWeight: '800', color: msg.withinBudget ? '#2E7D32' : '#C62828', fontSize: 16 }}>
                {msg.totalMin?.toLocaleString()} ₸
              </Text>
            </View>
            {msg.alternatives && (
              <View style={{ backgroundColor: '#FFF9E6', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#FFD700' }}>
                <Text style={{ color: '#666', fontSize: 13 }}>💡 {msg.alternatives}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 24 }}>🤖</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>O-GO AI</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Shopping Assistant</Text>
          </View>
          <View style={{ backgroundColor: '#22C55E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>● Online</Text>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { id: 'chat', label: '💬 Чат' },
            { id: 'compare', label: '📊 Сравнить' },
            { id: 'list', label: '🛒 Список' },
            { id: 'visual', label: '📸 По фото' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id as any)}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.2)' }}
            >
              <Text style={{ color: activeTab === tab.id ? '#FF4500' : '#fff', fontWeight: '700', fontSize: 13 }}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {activeTab === 'chat' && (
        <>
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {messages.map(msg => renderMessage(msg))}
            {loading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16 }}>🤖</Text>
                </View>
                <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 12, elevation: 2, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FF4500" />
                  <Text style={{ color: '#999', fontSize: 13 }}>AI думает...</Text>
                </View>
              </View>
            )}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#fff', maxHeight: 50 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
            {QUICK_PROMPTS.map(prompt => (
              <TouchableOpacity key={prompt} onPress={() => sendMessage(prompt)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFF0EB', borderWidth: 1, borderColor: '#FF450030' }}>
                <Text style={{ color: '#FF4500', fontSize: 12, fontWeight: '600' }}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={{ backgroundColor: '#fff', padding: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
            <TouchableOpacity onPress={pickImageForSearch} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="camera" size={20} color="#999" />
            </TouchableOpacity>
            <TextInput
              style={{ flex: 1, backgroundColor: '#f8f8f8', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, maxHeight: 120, borderWidth: 1.5, borderColor: '#f0f0f0' }}
              placeholder="Спроси AI о товарах..."
              value={input}
              onChangeText={setInput}
              multiline
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity
              onPress={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: input.trim() && !loading ? '#FF4500' : '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="send" size={20} color={input.trim() && !loading ? '#fff' : '#aaa'} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {activeTab === 'compare' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>📊 Сравнение цен</Text>
            <Text style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>Введи название товара чтобы сравнить цены у разных продавцов</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0', marginBottom: 12 }}>
              <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 12, fontSize: 15 }}
                placeholder="Например: Nike Air Max 90"
                value={compareQuery}
                onChangeText={setCompareQuery}
                placeholderTextColor="#ccc"
              />
            </View>
            <TouchableOpacity
              onPress={compareProducts}
              disabled={loading}
              style={{ backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="git-compare" size={18} color="#fff" />}
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Сравнить цены</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: '#FFF0EB', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FF450020' }}>
            <Text style={{ fontWeight: '700', color: '#FF4500', marginBottom: 6 }}>💡 Как работает</Text>
            <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>AI ищет одинаковые товары у разных продавцов и сортирует по цене.</Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'list' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>🛒 Умный список покупок</Text>
            <Text style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>Укажи бюджет и список — AI подберёт лучшие варианты</Text>
            <Text style={{ fontWeight: '700', color: '#333', marginBottom: 8 }}>💰 Бюджет (₸)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0', marginBottom: 14 }}>
              <Ionicons name="wallet-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput style={{ flex: 1, paddingVertical: 12, fontSize: 15 }} placeholder="50000" value={budget} onChangeText={setBudget} keyboardType="numeric" placeholderTextColor="#ccc" />
            </View>
            <Text style={{ fontWeight: '700', color: '#333', marginBottom: 8 }}>📝 Список (каждый товар с новой строки)</Text>
            <TextInput
              style={{ backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1.5, borderColor: '#f0f0f0', minHeight: 120, textAlignVertical: 'top', marginBottom: 14 }}
              placeholder={'Кроссовки\nДжинсы\nФутболка'}
              value={shoppingList}
              onChangeText={setShoppingList}
              multiline
              placeholderTextColor="#ccc"
            />
            <TouchableOpacity
              onPress={analyzeShoppingList}
              disabled={loading}
              style={{ backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Ionicons name="sparkles" size={18} color="#fff" />}
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Подобрать товары</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {activeTab === 'visual' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>📸 Поиск по фото</Text>
            <Text style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>Загрузи фото — AI найдёт похожие товары в O-GO</Text>
            <TouchableOpacity
              onPress={pickImageForSearch}
              style={{ height: 200, borderRadius: 20, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', marginBottom: 14, overflow: 'hidden' }}
            >
              {visualImage
                ? <Image source={{ uri: visualImage }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                : <>
                    <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                      <Ionicons name="camera" size={36} color="#FF4500" />
                    </View>
                    <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 16 }}>Загрузить фото</Text>
                    <Text style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>Нажми для выбора из галереи</Text>
                  </>
              }
            </TouchableOpacity>
            {visualImage && (
              <TouchableOpacity
                onPress={pickImageForSearch}
                style={{ backgroundColor: '#f0f0f0', borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#666', fontWeight: '600' }}>Выбрать другое фото</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ backgroundColor: '#FFF0EB', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FF450020' }}>
            <Text style={{ fontWeight: '700', color: '#FF4500', marginBottom: 6 }}>💡 Как работает</Text>
            <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>
              Gemini AI анализирует фото, определяет тип товара и ищет похожие в каталоге O-GO.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
