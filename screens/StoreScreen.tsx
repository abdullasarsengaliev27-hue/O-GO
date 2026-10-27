import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';

interface Props {
  sellerId: string;
  user: User | null;
  onBack: () => void;
}

export function StoreScreen({ sellerId, user, onBack }: Props) {
  const [seller, setSeller] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [avgRating, setAvgRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    getDoc(doc(db, 'users', sellerId)).then(snap => {
      if (snap.exists()) setSeller(snap.data());
    });
  }, [sellerId]);

  useEffect(() => {
    const q = query(collection(db, 'deals'), where('sellerId', '==', sellerId));
    return onSnapshot(q, async snap => {
      const myDeals = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((d: any) => !d.isHidden);
      setDeals(myDeals);
      setLoading(false);

      // Считаем средний рейтинг всех скидок
      let totalRating = 0;
      let totalCount = 0;
      for (const deal of myDeals) {
        const reviewsSnap = await onSnapshot(
          collection(db, 'deals', deal.id, 'reviews'),
          (reviewSnap) => {
            const reviews = reviewSnap.docs.map(d => d.data());
            reviews.forEach((r: any) => {
              totalRating += r.rating;
              totalCount++;
            });
            if (totalCount > 0) {
              setAvgRating(totalRating / totalCount);
              setTotalReviews(totalCount);
            }
          }
        );
      }
    });
  }, [sellerId]);

  const totalSavings = deals.reduce((sum, d) => sum + ((d.oldPrice || 0) - (d.newPrice || 0)), 0);
  const avgDiscount = deals.length > 0
    ? Math.round(deals.reduce((sum, d) => sum + (d.discount || 0), 0) / deals.length)
    : 0;
  const totalViews = deals.reduce((sum, d) => sum + (d.viewCount || 0), 0);

  if (loading) return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FF4500" />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Шапка */}
        <View style={{ backgroundColor: '#FF4500', paddingTop: 54, paddingBottom: 40, paddingHorizontal: 20 }}>
          <TouchableOpacity onPress={onBack} style={{ marginBottom: 16 }}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
              {seller?.storeLogo
                ? <Image source={{ uri: seller.storeLogo }} style={{ width: 80, height: 80 }} resizeMode="cover" />
                : <Ionicons name="storefront" size={38} color="#fff" />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
                {seller?.storeName || 'Магазин'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>
                {seller?.storeCategory || 'Магазин'}
              </Text>
              {seller?.city && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>{seller.city}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Рейтинг */}
          {avgRating > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' }}>
              <Ionicons name="star" size={16} color="#FFD700" />
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{avgRating.toFixed(1)}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>({totalReviews} отзывов)</Text>
            </View>
          )}
        </View>

        {/* Статистика */}
        <View style={{ marginHorizontal: 16, marginTop: -20, backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.1, shadowRadius: 10, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#FFF0EB', borderRadius: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#FF4500' }}>{deals.length}</Text>
              <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>Скидок</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#EEF2FF', borderRadius: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: '900', color: '#6366F1' }}>{avgDiscount}%</Text>
              <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>Ср. скидка</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#F0FFF4', borderRadius: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#22C55E' }}>{(totalSavings / 1000).toFixed(0)}K</Text>
              <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>Экономия ₸</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#FFFBEB', borderRadius: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#F59E0B' }}>{totalViews}</Text>
              <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>Просмотров</Text>
            </View>
          </View>
        </View>

        {/* Инфо */}
        {(seller?.storeAddress || seller?.storePhone || seller?.storeDescription) && (
          <View style={{ marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16 }}>
            {seller?.storeDescription && (
              <Text style={{ color: '#555', fontSize: 14, lineHeight: 20, marginBottom: 12 }}>{seller.storeDescription}</Text>
            )}
            {seller?.storeAddress && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="location" size={18} color="#FF4500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#999', fontSize: 11 }}>Адрес</Text>
                  <Text style={{ color: '#1a1a1a', fontWeight: '600', fontSize: 14 }}>{seller.storeAddress}</Text>
                </View>
              </View>
            )}
            {seller?.storePhone && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="call" size={18} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#999', fontSize: 11 }}>Телефон</Text>
                  <Text style={{ color: '#1a1a1a', fontWeight: '600', fontSize: 14 }}>{seller.storePhone}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Скидки */}
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 }}>
            🏷 Активные скидки ({deals.length})
          </Text>
        </View>

        {deals.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 56 }}>🏪</Text>
            </View>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 }}>Нет активных скидок</Text>
            <Text style={{ color: '#aaa', textAlign: 'center', fontSize: 14, lineHeight: 20 }}>
              Этот магазин пока не опубликовал скидки. Загляни позже!
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 16 }}>
            {deals.map(deal => (
              <DealCard key={deal.id} item={deal} user={user} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}
