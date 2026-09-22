import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from 'firebase/auth';
import { styles } from '../../components/styles';

export function SellerStats({ user }: { user: User }) {
  const [deals, setDeals] = useState<any[]>([]);
  const [totalFavs, setTotalFavs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'deals'), where('sellerId', '==', user.uid));
    return onSnapshot(q, async snap => {
      const myDeals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setDeals(myDeals);
      setLoading(false);
      let favCount = 0;
      const usersSnap = await getDocs(collection(db, 'users'));
      for (const userDoc of usersSnap.docs) {
        for (const deal of myDeals) {
          const favSnap = await getDoc(doc(db, 'users', userDoc.id, 'favorites', deal.id));
          if (favSnap.exists()) favCount++;
        }
      }
      setTotalFavs(favCount);
    });
  }, [user]);

  const deleteDeal = (deal: any) => {
    Alert.alert('🗑 Удалить скидку?', `"${deal.title}" будет удалена навсегда`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        setDeletingId(deal.id);
        try {
          await deleteDoc(doc(db, 'deals', deal.id));
          Alert.alert('✅ Скидка удалена');
        } catch (e: any) { Alert.alert('Ошибка', e.message); }
        setDeletingId(null);
      }}
    ]);
  };

  const toggleDeal = async (deal: any) => {
    setTogglingId(deal.id);
    try {
      await updateDoc(doc(db, 'deals', deal.id), { isHidden: !deal.isHidden });
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setTogglingId(null);
  };

  const totalViews = deals.reduce((sum, d) => sum + (d.viewCount || 0), 0);
  const totalSavings = deals.reduce((sum, d) => sum + ((d.oldPrice || 0) - (d.newPrice || 0)), 0);
  const avgDiscount = deals.length > 0 ? Math.round(deals.reduce((sum, d) => sum + d.discount, 0) / deals.length) : 0;
  const activeDeals = deals.filter(d => !d.isHidden);
  const hiddenDeals = deals.filter(d => d.isHidden);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#FF4500" />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} showsVerticalScrollIndicator={false}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 }}>📊 Статистика</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Аналитика вашего магазина</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -24 }}>
        {/* Главные метрики */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.1, shadowRadius: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="eye" size={22} color="#FF4500" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#FF4500' }}>{totalViews}</Text>
            <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>Просмотров</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.1, shadowRadius: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="heart" size={22} color="#FF4500" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#FF4500' }}>{totalFavs}</Text>
            <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>В избранном</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.1, shadowRadius: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="pricetag" size={22} color="#22C55E" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#22C55E' }}>{activeDeals.length}</Text>
            <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>Активных</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.1, shadowRadius: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="trending-down" size={22} color="#3B82F6" />
            </View>
            <Text style={{ fontSize: 28, fontWeight: '900', color: '#3B82F6' }}>{avgDiscount}%</Text>
            <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>Ср. скидка</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.1, shadowRadius: 10 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
              <Ionicons name="wallet" size={22} color="#10B981" />
            </View>
            <Text style={{ fontSize: 22, fontWeight: '900', color: '#10B981' }}>{(totalSavings / 1000).toFixed(0)}K</Text>
            <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>Экономия ₸</Text>
          </View>
        </View>

        {/* Активные скидки */}
        {activeDeals.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#22C55E' }} />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#1a1a1a' }}>Активные ({activeDeals.length})</Text>
            </View>
            {activeDeals.map(deal => (
              <DealManageCard
                key={deal.id}
                deal={deal}
                onDelete={() => deleteDeal(deal)}
                onToggle={() => toggleDeal(deal)}
                isDeleting={deletingId === deal.id}
                isToggling={togglingId === deal.id}
              />
            ))}
          </View>
        )}

        {/* Скрытые скидки */}
        {hiddenDeals.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ccc' }} />
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#999' }}>Скрытые ({hiddenDeals.length})</Text>
            </View>
            {hiddenDeals.map(deal => (
              <DealManageCard
                key={deal.id}
                deal={deal}
                onDelete={() => deleteDeal(deal)}
                onToggle={() => toggleDeal(deal)}
                isDeleting={deletingId === deal.id}
                isToggling={togglingId === deal.id}
              />
            ))}
          </View>
        )}

        {deals.length === 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 40, alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>📭</Text>
            <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 18, marginBottom: 6 }}>Нет скидок</Text>
            <Text style={{ color: '#999', textAlign: 'center' }}>Создайте первую скидочную карточку</Text>
          </View>
        )}

        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}

function DealManageCard({ deal, onDelete, onToggle, isDeleting, isToggling }: any) {
  const isHidden = deal.isHidden;

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, marginBottom: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, opacity: isHidden ? 0.75 : 1 }}>
      <View style={{ height: 4, backgroundColor: isHidden ? '#e0e0e0' : '#FF4500' }} />

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
          {/* Бейдж */}
          <View style={{ width: 58, height: 58, borderRadius: 16, backgroundColor: isHidden ? '#f0f0f0' : '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: isHidden ? '#aaa' : '#FF4500', fontWeight: '900', fontSize: 14 }}>-{deal.discount}%</Text>
            {deal.hasDelivery && <Text style={{ fontSize: 11 }}>🚚</Text>}
          </View>

          {/* Инфо */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: isHidden ? '#999' : '#1a1a1a', fontSize: 15 }} numberOfLines={1}>{deal.title}</Text>
            <Text style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{deal.category} · {deal.city}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 15 }}>{Number(deal.newPrice).toLocaleString()} ₸</Text>
              <Text style={{ color: '#ccc', fontSize: 12, textDecorationLine: 'line-through' }}>{Number(deal.oldPrice).toLocaleString()} ₸</Text>
            </View>
          </View>

          {/* Статус */}
          <View style={{ backgroundColor: isHidden ? '#f5f5f5' : '#FFF0EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }}>
            <Text style={{ color: isHidden ? '#999' : '#FF4500', fontSize: 11, fontWeight: '700' }}>
              {isHidden ? '🙈 Скрыто' : '✅ Активно'}
            </Text>
          </View>
        </View>

        {/* Аналитика */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10, backgroundColor: '#f8f8f8', borderRadius: 12, padding: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="eye-outline" size={14} color="#FF4500" />
            <Text style={{ color: '#555', fontSize: 12, fontWeight: '600' }}>{deal.viewCount || 0} просмотров</Text>
          </View>
          <View style={{ width: 1, backgroundColor: '#e0e0e0' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="heart-outline" size={14} color="#FF4500" />
            <Text style={{ color: '#555', fontSize: 12, fontWeight: '600' }}>в избранном</Text>
          </View>
          {deal.sizes?.length > 0 && (
            <>
              <View style={{ width: 1, backgroundColor: '#e0e0e0' }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="resize-outline" size={14} color="#3B82F6" />
                <Text style={{ color: '#555', fontSize: 12, fontWeight: '600' }}>{deal.sizes.length} разм.</Text>
              </View>
            </>
          )}
        </View>

        {/* Теги */}
        {(deal.colorVariants?.length > 0 || deal.foodTags?.length > 0 || deal.hasBooking) && (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {deal.colorVariants?.length > 0 && (
              <View style={{ backgroundColor: '#FFF0EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: '#FF4500', fontSize: 11, fontWeight: '600' }}>�� {deal.colorVariants.length} цветов</Text>
              </View>
            )}
            {deal.foodTags?.length > 0 && (
              <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: '#FF9800', fontSize: 11, fontWeight: '600' }}>{deal.foodTags[0]}</Text>
              </View>
            )}
            {deal.hasBooking && (
              <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '600' }}>🗓 Бронь</Text>
              </View>
            )}
          </View>
        )}

        {/* Кнопки */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            onPress={onToggle}
            disabled={isToggling}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isHidden ? '#E8F5E9' : '#f5f5f5', borderRadius: 12, paddingVertical: 11, gap: 6 }}
          >
            {isToggling
              ? <ActivityIndicator size="small" color="#666" />
              : <>
                  <Ionicons name={isHidden ? 'eye' : 'eye-off'} size={16} color={isHidden ? '#22C55E' : '#666'} />
                  <Text style={{ color: isHidden ? '#22C55E' : '#666', fontWeight: '700', fontSize: 13 }}>
                    {isHidden ? 'Показать' : 'Скрыть'}
                  </Text>
                </>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDelete}
            disabled={isDeleting}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0EB', borderRadius: 12, paddingVertical: 11, gap: 6, borderWidth: 1.5, borderColor: '#FF4500' }}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color="#FF4500" />
              : <>
                  <Ionicons name="trash-outline" size={16} color="#FF4500" />
                  <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 13 }}>Удалить</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
