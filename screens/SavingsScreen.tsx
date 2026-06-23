import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';

const CATEGORY_COLORS: Record<string, string> = {
  '👟 Обувь': '#F59E0B',
  '📱 Техника': '#6366F1',
  '🍕 Еда': '#FF6B35',
  '👕 Одежда': '#EC4899',
  '💄 Косметика': '#A855F7',
  '📦 Магазин': '#10B981',
};

export function SavingsScreen({ user }: { user: User }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all');

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user]);

  const now = new Date();
  const filtered = orders.filter(o => {
    if (period === 'all') return true;
    const date = new Date(o.createdAt);
    if (period === 'week') return (now.getTime() - date.getTime()) < 7 * 24 * 60 * 60 * 1000;
    if (period === 'month') return (now.getTime() - date.getTime()) < 30 * 24 * 60 * 60 * 1000;
    return true;
  });

  const totalSavings = filtered.reduce((sum, o) => {
    const market = o.marketPrice || o.oldPrice || 0;
    return sum + (Number(market) - Number(o.price));
  }, 0);
  const totalSpent = filtered.reduce((sum, o) => sum + Number(o.price), 0);
  const totalOrders = filtered.length;
  const savingsPercent = totalSpent > 0 ? Math.round((totalSavings / (totalSavings + totalSpent)) * 100) : 0;

  const byCategory: Record<string, number> = {};
  filtered.forEach(o => {
    const cat = o.category || 'Другое';
    const saving = Number(o.marketPrice || o.oldPrice || 0) - Number(o.price);
    byCategory[cat] = (byCategory[cat] || 0) + saving;
  });
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const topDeals = [...filtered]
    .map(o => ({ ...o, saving: Number(o.marketPrice || o.oldPrice || 0) - Number(o.price) }))
    .sort((a, b) => b.saving - a.saving)
    .slice(0, 3);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
      <ActivityIndicator size="large" color="#FF4500" />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} showsVerticalScrollIndicator={false}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: 20, paddingBottom: 50, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 }}>💰 Моя экономия</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Сколько ты сохранил с O-GO</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -30 }}>
        {/* Главная карточка */}
        <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 16, elevation: 6, shadowColor: '#FF4500', shadowOpacity: 0.15, shadowRadius: 16, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 32 }}>💰</Text>
          </View>
          <Text style={{ color: '#999', fontSize: 14, marginBottom: 4 }}>Ты сэкономил</Text>
          <Text style={{ color: '#FF4500', fontSize: 44, fontWeight: '900', marginBottom: 4 }}>
            {totalSavings.toLocaleString()} ₸
          </Text>
          <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 20 }}>
            <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: 13 }}>🎉 Ты молодец!</Text>
          </View>

          {/* Статистика */}
          <View style={{ flexDirection: 'row', width: '100%' }}>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#f8f8f8', borderRadius: 14, marginRight: 6 }}>
              <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 20 }}>{totalOrders}</Text>
              <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>Заказов</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#f8f8f8', borderRadius: 14, marginHorizontal: 3 }}>
              <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 16 }}>{totalSpent.toLocaleString()} ₸</Text>
              <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>Потрачено</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: '#f8f8f8', borderRadius: 14, marginLeft: 6 }}>
              <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 20 }}>{savingsPercent}%</Text>
              <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>Экономия</Text>
            </View>
          </View>
        </View>

        {/* Фильтр периода */}
        <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 4, marginBottom: 16, elevation: 2 }}>
          {(['week', 'month', 'all'] as const).map(p => (
            <TouchableOpacity
              key={p}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: period === p ? '#FF4500' : 'transparent', alignItems: 'center' }}
              onPress={() => setPeriod(p)}
            >
              <Text style={{ color: period === p ? '#fff' : '#999', fontWeight: '700', fontSize: 13 }}>
                {p === 'week' ? 'Неделя' : p === 'month' ? 'Месяц' : 'Всё время'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Ты vs Рынок */}
        {totalSavings > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="trending-down" size={20} color="#22C55E" />
              <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 16 }}>Ты vs Рынок</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: '#FF4500', borderRadius: 16, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginBottom: 4 }}>✅ С O-GO</Text>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{totalSpent.toLocaleString()} ₸</Text>
              </View>
              <View style={{ justifyContent: 'center', alignItems: 'center', width: 32 }}>
                <View style={{ backgroundColor: '#f0f0f0', borderRadius: 16, width: 32, height: 32, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#22C55E' }}>VS</Text>
                </View>
              </View>
              <View style={{ flex: 1, backgroundColor: '#f8f8f8', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: '#eee' }}>
                <Text style={{ color: '#999', fontSize: 11, marginBottom: 4 }}>❌ Без O-GO</Text>
                <Text style={{ color: '#aaa', fontWeight: '800', fontSize: 18, textDecorationLine: 'line-through' }}>
                  {(totalSpent + totalSavings).toLocaleString()} ₸
                </Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, alignItems: 'center', marginTop: 12, flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="wallet" size={18} color="#22C55E" />
              <Text style={{ color: '#166534', fontWeight: '700', fontSize: 15 }}>
                Ты сохранил {totalSavings.toLocaleString()} ₸
              </Text>
            </View>
          </View>
        )}

        {/* Экономия по категориям */}
        {topCategories.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="bar-chart" size={20} color="#FF4500" />
              <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 16 }}>По категориям</Text>
            </View>
            {topCategories.map(([cat, saving], i) => {
              const maxSaving = topCategories[0][1];
              const percent = (saving / maxSaving) * 100;
              const color = CATEGORY_COLORS[cat] || '#FF4500';
              return (
                <View key={cat} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#1a1a1a', fontSize: 14, fontWeight: '600' }}>{cat}</Text>
                    <Text style={{ color: color, fontWeight: '800', fontSize: 14 }}>{saving.toLocaleString()} ₸</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ width: `${percent}%`, height: 8, backgroundColor: color, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Топ сделки */}
        {topDeals.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 24, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <Ionicons name="trophy" size={20} color="#FFB800" />
              <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 16 }}>Лучшие сделки</Text>
            </View>
            {topDeals.map((deal, i) => (
              <View key={deal.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: i < topDeals.length - 1 ? 1 : 0, borderBottomColor: '#f5f5f5' }}>
                <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Text style={{ fontWeight: '900', color: '#fff', fontSize: 16 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 14 }} numberOfLines={1}>{deal.dealTitle}</Text>
                  <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{new Date(deal.createdAt).toLocaleDateString('ru-RU')}</Text>
                </View>
                <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 }}>
                  <Text style={{ color: '#22C55E', fontWeight: '800', fontSize: 13 }}>-{deal.saving.toLocaleString()} ₸</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Пустой экран */}
        {totalOrders === 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', elevation: 2 }}>
            <Text style={{ fontSize: 56, marginBottom: 16 }}>💸</Text>
            <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 20, marginBottom: 8 }}>Начни экономить!</Text>
            <Text style={{ color: '#999', textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
              Оформи первый заказ через O-GO{'\n'}и увидишь свою экономию здесь
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
