import { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';
import * as ImagePicker from 'expo-image-picker';

const QUICK_PROMPTS = [
  '👟 Найди кроссовки до 20 000 ₸',
  '👗 Платье на лето до 15 000 ₸',
  '📱 Смартфон до 150 000 ₸',
  '💄 Косметика до 5 000 ₸',
  '🍕 Еда со скидкой рядом',
];

export function AIScreen({ user, userCity }: { user: User | null, userCity?: string | null }) {
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
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    return onSnapshot(collection(db, 'deals'), snap => {
      setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((d: any) => !d.isHidden));
    });
  }, []);

  const searchDeals = (query: string, maxPrice?: number, category?: string) => {
    return deals.filter((d: any) => {
      const matchQuery = query === '' ||
        d.title?.toLowerCase().includes(query.toLowerCase()) ||
        d.description?.toLowerCase().includes(query.toLowerCase()) ||
        d.category?.toLowerCase().includes(query.toLowerCase()) ||
        d.store?.toLowerCase().includes(query.toLowerCase());
      const matchPrice = !maxPrice || Number(d.newPrice) <= maxPrice;
      const matchCat = !category || d.category?.toLowerCase().includes(category.toLowerCase());
      const matchCity = !userCity || userCity === 'Все' || d.city === userCity;
      return matchQuery && matchPrice && matchCat && matchCity;
    }).slice(0, 6);
  };

  const parseQuery = (text: string) => {
    const lowerText = text.toLowerCase();
    let maxPrice: number | undefined;
    let category: string | undefined;
    let searchTerm = text;

    // Извлекаем бюджет
    const priceMatch = text.match(/(\d+[\s]?000|до\s*(\d+)[\s]?[₸тг])/i);
    if (priceMatch) {
      const priceStr = priceMatch[0].replace(/[^0-9]/g, '');
      maxPrice = parseInt(priceStr);
      if (priceStr.length <= 3) maxPrice *= 1000;
    }

    // Определяем категорию
    if (lowerText.includes('кроссовк') || lowerText.includes('обувь') || lowerText.includes('ботинк') || lowerText.includes('туфл')) {
      category = 'Обувь';
    } else if (lowerText.includes('одежд') || lowerText.includes('платье') || lowerText.includes('футболк') || lowerText.includes('куртк') || lowerText.includes('джинс')) {
      category = 'Одежда';
    } else if (lowerText.includes('телефон') || lowerText.includes('смартфон') || lowerText.includes('техник') || lowerText.includes('ноутбук') || lowerText.includes('планшет')) {
      category = 'Техника';
    } else if (lowerText.includes('косметик') || lowerText.includes('крем') || lowerText.includes('парфюм') || lowerText.includes('шампунь')) {
      category = 'Косметика';
    } else if (lowerText.includes('еда') || lowerText.includes('кафе') || lowerText.includes('ресторан') || lowerText.includes('пицц') || lowerText.includes('суши')) {
      category = 'Еда';
    }

    return { maxPrice, category, searchTerm };
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;
    setInput('');

    const userMsg = { id: Date.now().toString(), role: 'user', type: 'text', text: messageText };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    setTimeout(() => {
      const { maxPrice, category, searchTerm } = parseQuery(messageText);
      const results = searchDeals(searchTerm, maxPrice, category);

      let responseText = '';
      if (results.length === 0) {
        responseText = `😔 По запросу "${messageText}" ничего не найдено.\n\nПопробуй:\n• Изменить запрос\n• Увеличить бюджет\n• Выбрать другую категорию`;
      } else {
        const priceInfo = maxPrice ? ` до ${maxPrice.toLocaleString()} ₸` : '';
        const catInfo = category ? ` в категории "${category}"` : '';
        responseText = `🎯 Нашёл ${results.length} вариантов${catInfo}${priceInfo}:\n\n${
          results.slice(0, 3).map((d: any, i) =>
            `${i + 1}. ${d.title}\n   💰 ${Number(d.newPrice).toLocaleString()} ₸ (-${d.discount}%)\n   🏪 ${d.store}`
          ).join('\n\n')
        }${results.length > 3 ? `\n\n...и ещё ${results.length - 3} вариантов ниже 👇` : ''}`;
      }

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        type: results.length > 0 ? 'deals' : 'text',
        text: responseText,
        deals: results,
      };
      setMessages(prev => [...prev, assistantMsg]);
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    }, 1000);
  };

  const compareProducts = () => {
    if (!compareQuery.trim()) return Alert.alert('Введи название товара');
    const results = deals
      .filter((d: any) =>
        d.title?.toLowerCase().includes(compareQuery.toLowerCase()) ||
        d.description?.toLowerCase().includes(compareQuery.toLowerCase())
      )
      .sort((a: any, b: any) => Number(a.newPrice) - Number(b.newPrice))
      .slice(0, 8);

    const msg = {
      id: Date.now().toString(),
      role: 'assistant',
      type: results.length > 0 ? 'compare' : 'text',
      text: results.length > 0
        ? `📊 Сравнение цен на "${compareQuery}":\nНайдено ${results.length} предложений, отсортировано по цене`
        : `😔 Товар "${compareQuery}" не найден в каталоге`,
      deals: results,
    };
    setMessages([
      { id: '1', role: 'assistant', type: 'text', text: `Привет! 👋 Я AI Shopping Assistant O-GO.` },
      { id: '2', role: 'user', type: 'text', text: `Сравни цены: ${compareQuery}` },
      msg,
    ]);
    setActiveTab('chat');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const analyzeShoppingList = () => {
    if (!shoppingList.trim() || !budget.trim()) return Alert.alert('Заполни список и бюджет');
    const budgetNum = parseInt(budget.replace(/\D/g, ''));
    const items = shoppingList.split('\n').filter(i => i.trim());

    let totalMin = 0;
    const recommendations: any[] = [];

    items.forEach(item => {
      const found = deals
        .filter((d: any) =>
          d.title?.toLowerCase().includes(item.toLowerCase()) ||
          d.category?.toLowerCase().includes(item.toLowerCase())
        )
        .sort((a: any, b: any) => Number(a.newPrice) - Number(b.newPrice))[0];

      if (found) {
        totalMin += Number(found.newPrice);
        recommendations.push({ item, deal: found });
      }
    });

    const withinBudget = totalMin <= budgetNum;
    const responseText = `🛒 Анализ списка покупок:\n\nБюджет: ${budgetNum.toLocaleString()} ₸\nМинимальная сумма: ${totalMin.toLocaleString()} ₸\n\n${withinBudget ? '✅ Укладываетесь в бюджет!' : `⚠️ Превышение на ${(totalMin - budgetNum).toLocaleString()} ₸`}\n\nЛучшие варианты по каждому пункту:`;

    const msg = {
      id: Date.now().toString(),
      role: 'assistant',
      type: 'shopping_list',
      text: responseText,
      recommendations,
      totalMin,
      budget: budgetNum,
    };
    setMessages([
      { id: '1', role: 'assistant', type: 'text', text: `Привет! 👋 Я AI Shopping Assistant O-GO.` },
      { id: '2', role: 'user', type: 'text', text: `Список: ${shoppingList}\nБюджет: ${budget} ₸` },
      msg,
    ]);
    setActiveTab('chat');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const pickImageForSearch = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.8,
    });
    if (!result.canceled) {
      setVisualImage(result.assets[0].uri);
      setLoading(true);

      const userMsg = {
        id: Date.now().toString(),
        role: 'user',
        type: 'image',
        text: 'Найди похожие товары по фото',
        image: result.assets[0].uri,
      };
      setMessages(prev => [...prev, userMsg]);
      setActiveTab('chat');

      // Симулируем AI анализ фото
      setTimeout(() => {
        const randomCategories = ['👕 Одежда', '👟 Обувь', '💄 Косметика', '📱 Техника'];
        const detectedCategory = randomCategories[Math.floor(Math.random() * randomCategories.length)];
        const results = deals.filter((d: any) =>
          d.category?.includes(detectedCategory.split(' ')[1])
        ).slice(0, 4);

        const assistantMsg = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          type: results.length > 0 ? 'deals' : 'text',
          text: `🔍 Анализирую фото...\n\nОбнаружил: ${detectedCategory}\n\nПохожие товары в O-GO:`,
          deals: results,
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
      }, 2000);
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

        {msg.type === 'shopping_list' && msg.recommendations?.length > 0 && (
          <View style={{ marginLeft: 40 }}>
            {msg.recommendations.map(({ item, deal }: any, i: number) => (
              <View key={i} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, elevation: 2 }}>
                <Text style={{ color: '#999', fontSize: 11, marginBottom: 4 }}>📝 {item}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {deal.imageUrl && <Image source={{ uri: deal.imageUrl }} style={{ width: 44, height: 44, borderRadius: 10 }} resizeMode="cover" />}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 13 }} numberOfLines={1}>{deal.title}</Text>
                    <Text style={{ color: '#FF4500', fontWeight: '700' }}>{Number(deal.newPrice).toLocaleString()} ₸ · -{deal.discount}%</Text>
                  </View>
                </View>
              </View>
            ))}
            <View style={{ backgroundColor: msg.totalMin <= msg.budget ? '#E8F5E9' : '#FFEBEE', borderRadius: 14, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontWeight: '700', color: msg.totalMin <= msg.budget ? '#2E7D32' : '#C62828' }}>
                {msg.totalMin <= msg.budget ? '✅ В бюджете!' : '⚠️ Превышение'}
              </Text>
              <Text style={{ fontWeight: '800', color: msg.totalMin <= msg.budget ? '#2E7D32' : '#C62828', fontSize: 16 }}>
                {msg.totalMin.toLocaleString()} ₸
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16 }}>
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

        {/* Вкладки */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {[
            { id: 'chat', label: '💬 Чат', icon: 'chatbubble-ellipses' },
            { id: 'compare', label: '📊 Сравнить', icon: 'git-compare' },
            { id: 'list', label: '🛒 Список', icon: 'list' },
            { id: 'visual', label: '📸 По фото', icon: 'camera' },
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

      {/* Чат */}
      {activeTab === 'chat' && (
        <>
          <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {messages.map(msg => renderMessage(msg))}
            {loading && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16 }}>🤖</Text>
                </View>
                <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 12, elevation: 2 }}>
                  <ActivityIndicator size="small" color="#FF4500" />
                </View>
              </View>
            )}
          </ScrollView>

          {/* Быстрые промпты */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#fff', maxHeight: 50 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
            {QUICK_PROMPTS.map(prompt => (
              <TouchableOpacity key={prompt} onPress={() => sendMessage(prompt)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFF0EB', borderWidth: 1, borderColor: '#FF4500' + '30' }}>
                <Text style={{ color: '#FF4500', fontSize: 12, fontWeight: '600' }}>{prompt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Поле ввода */}
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
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: input.trim() ? '#FF4500' : '#f0f0f0', justifyContent: 'center', alignItems: 'center' }}
            >
              <Ionicons name="send" size={20} color={input.trim() ? '#fff' : '#aaa'} />
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Сравнение цен */}
      {activeTab === 'compare' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>📊 Сравнение цен</Text>
            <Text style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>Введи название товара чтобы сравнить цены в разных магазинах</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0', marginBottom: 12 }}>
              <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 12, fontSize: 15 }}
                placeholder="Например: Nike Air Max"
                value={compareQuery}
                onChangeText={setCompareQuery}
                placeholderTextColor="#ccc"
              />
            </View>
            <TouchableOpacity onPress={compareProducts} style={{ backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="git-compare" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Сравнить цены</Text>
            </TouchableOpacity>
          </View>
          <View style={{ backgroundColor: '#FFF0EB', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FF4500' + '20' }}>
            <Text style={{ fontWeight: '700', color: '#FF4500', marginBottom: 6 }}>💡 Как работает</Text>
            <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>AI ищет одинаковые товары у разных продавцов и сортирует по цене — от самого дешёвого до дорогого.</Text>
          </View>
        </ScrollView>
      )}

      {/* Список покупок */}
      {activeTab === 'list' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>🛒 Умный список покупок</Text>
            <Text style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>Укажи бюджет и список товаров — AI подберёт лучшие варианты</Text>
            <Text style={{ fontWeight: '700', color: '#333', marginBottom: 8 }}>💰 Бюджет (₸)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0', marginBottom: 14 }}>
              <Ionicons name="wallet-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
              <TextInput
                style={{ flex: 1, paddingVertical: 12, fontSize: 15 }}
                placeholder="50000"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
                placeholderTextColor="#ccc"
              />
            </View>
            <Text style={{ fontWeight: '700', color: '#333', marginBottom: 8 }}>📝 Список товаров (каждый с новой строки)</Text>
            <TextInput
              style={{ backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1.5, borderColor: '#f0f0f0', minHeight: 120, textAlignVertical: 'top', marginBottom: 14 }}
              placeholder={'Кроссовки\nДжинсы\nФутболка\nКуртка'}
              value={shoppingList}
              onChangeText={setShoppingList}
              multiline
              placeholderTextColor="#ccc"
            />
            <TouchableOpacity onPress={analyzeShoppingList} style={{ backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="sparkles" size={18} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Подобрать товары</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Поиск по фото */}
      {activeTab === 'visual' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>📸 Поиск по фото</Text>
            <Text style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>Загрузи фото товара — AI найдёт похожие в каталоге O-GO</Text>

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
                    <Text style={{ color: '#aaa', fontSize: 13, marginTop: 4 }}>или нажми для выбора</Text>
                  </>
              }
            </TouchableOpacity>

            {visualImage && (
              <TouchableOpacity
                onPress={pickImageForSearch}
                style={{ backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
              >
                <Ionicons name="search" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Найти похожие товары</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ backgroundColor: '#FFF0EB', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#FF4500' + '20' }}>
            <Text style={{ fontWeight: '700', color: '#FF4500', marginBottom: 6 }}>💡 Как работает</Text>
            <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>
              AI анализирует фото, определяет категорию товара и ищет похожие предложения в каталоге O-GO со скидками.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
