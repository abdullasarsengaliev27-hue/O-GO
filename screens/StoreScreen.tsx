import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';
import { styles } from '../components/styles';

const CATEGORY_LABELS: Record<string, string> = {
  clothing: '👕 Одежда и Обувь',
  food: '🍔 Еда и рестораны',
  tech: '💻 Техника и гаджеты',
  beauty: '💄 Косметика',
  general: '📦 Магазин',
};

export function StoreScreen({ sellerId, user, onBack }: {
  sellerId: string;
  user: User | null;
  onBack: () => void;
}) {
  const [seller, setSeller] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Загружаем профиль продавца
    getDoc(doc(db, 'users', sellerId)).then(snap => {
      if (snap.exists()) setSeller(snap.data());
      setLoading(false);
    });

    // Загружаем скидки продавца
    const q = query(
      collection(db, 'deals'),
      where('sellerId', '==', sellerId)
    );
    return onSnapshot(q, snap => {
      setDeals(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => !d.isHidden)
      );
    });
  }, [sellerId]);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#FF4500" />
    </View>
  );

  const avgRating = 4.8; // TODO: считать из отзывов
  const totalSavings = deals.reduce((sum, d: any) => sum + (d.oldPrice - d.newPrice), 0);

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView>
        {/* Шапка */}
        <View style={{ backgroundColor: '#FF4500', paddingTop: 16, paddingBottom: 30, paddingHorizontal: 20 }}>
          {/* Назад */}
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>

          {/* Логотип + инфо */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' }}>
              {seller?.storeLogo
                ? <Image source={{ uri: seller.storeLogo }} style={{ width: 80, height: 80 }} resizeMode="cover" />
                : <Ionicons name="storefront" size={36} color="#FF4500" />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 }}>
                {seller?.storeName || 'Магазин'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                {CATEGORY_LABELS[seller?.storeCategory] || '🏪 Магазин'}
              </Text>
              {seller?.storeGender && (
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{seller.storeGender}</Text>
              )}
            </View>
          </View>

          {/* Статистика */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{deals.length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Скидок</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                {deals.length > 0 ? Math.round(deals.reduce((s, d: any) => s + d.discount, 0) / deals.length) : 0}%
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Ср. скидка</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                {(totalSavings / 1000).toFixed(0)}K ₸
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Экономия</Text>
            </View>
          </View>
        </View>

        {/* Инфо о магазине */}
        <View style={{ backgroundColor: '#fff', margin: 12, borderRadius: 16, padding: 16 }}>
          {seller?.storeDescription && (
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#333', fontSize: 14, lineHeight: 20 }}>{seller.storeDescription}</Text>
            </View>
          )}
          {seller?.storeAddress && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              <Ionicons name="location" size={18} color="#FF4500" style={{ marginRight: 10 }} />
              <Text style={{ color: '#333', flex: 1 }}>{seller.storeAddress}</Text>
            </View>
          )}
          {seller?.storePhone && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              <Ionicons name="call" size={18} color="#4CAF50" style={{ marginRight: 10 }} />
              <Text style={{ color: '#333' }}>{seller.storePhone}</Text>
            </View>
          )}
          {seller?.city && (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
              <Ionicons name="business" size={18} color="#2196F3" style={{ marginRight: 10 }} />
              <Text style={{ color: '#333' }}>📍 {seller.city}</Text>
            </View>
          )}
        </View>

        {/* Все скидки магазина */}
        <View style={{ paddingHorizontal: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
            🏷 Все скидки магазина ({deals.length})
          </Text>
          {deals.length === 0 ? (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📭</Text>
              <Text style={{ color: '#aaa' }}>Нет активных скидок</Text>
            </View>
          ) : deals.map(deal => (
            <DealCard key={deal.id} item={deal} user={user} />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
