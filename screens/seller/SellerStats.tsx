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
    Alert.alert(
      '🗑 Удалить скидку?',
      `"${deal.title}" будет удалена навсегда`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(deal.id);
            try {
              await deleteDoc(doc(db, 'deals', deal.id));
              Alert.alert('✅ Скидка удалена');
            } catch (e: any) {
              Alert.alert('Ошибка', e.message);
            }
            setDeletingId(null);
          }
        }
      ]
    );
  };

  const toggleDeal = async (deal: any) => {
    setTogglingId(deal.id);
    try {
      await updateDoc(doc(db, 'deals', deal.id), {
        isHidden: !deal.isHidden,
      });
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
    setTogglingId(null);
  };

  const totalSavings = deals.reduce((sum, d) => sum + (d.oldPrice - d.newPrice), 0);
  const avgDiscount = deals.length > 0 ? Math.round(deals.reduce((sum, d) => sum + d.discount, 0) / deals.length) : 0;
  const activeDeals = deals.filter(d => !d.isHidden);
  const hiddenDeals = deals.filter(d => d.isHidden);

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#FF4500" />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#222', marginBottom: 16 }}>📊 Мои скидки</Text>

      {/* Статистика */}
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{activeDeals.length}</Text>
          <Text style={styles.statLabel}>Активных</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{hiddenDeals.length}</Text>
          <Text style={styles.statLabel}>Скрытых</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalFavs}</Text>
          <Text style={styles.statLabel}>В избранном</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{(totalSavings / 1000).toFixed(0)}K ₸</Text>
          <Text style={styles.statLabel}>Экономия</Text>
        </View>
      </View>

      {/* Активные скидки */}
      {activeDeals.length > 0 && (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 10 }}>
            ✅ Активные ({activeDeals.length})
          </Text>
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
        </>
      )}

      {/* Скрытые скидки */}
      {hiddenDeals.length > 0 && (
        <>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#999', marginBottom: 10, marginTop: 8 }}>
            🙈 Скрытые ({hiddenDeals.length})
          </Text>
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
        </>
      )}

      {deals.length === 0 && (
        <View style={[styles.center, { marginTop: 40 }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={{ color: '#aaa', textAlign: 'center' }}>Нет опубликованных скидок</Text>
        </View>
      )}
    </ScrollView>
  );
}

function DealManageCard({ deal, onDelete, onToggle, isDeleting, isToggling }: any) {
  const isHidden = deal.isHidden;

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', elevation: 2, opacity: isHidden ? 0.7 : 1 }}>
      {/* Цветная полоска */}
      <View style={{ height: 4, backgroundColor: isHidden ? '#ccc' : '#FF4500' }} />

      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {/* Бейдж скидки */}
          <View style={{ backgroundColor: isHidden ? '#ccc' : '#FF4500', borderRadius: 10, width: 56, height: 56, justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>-{deal.discount}%</Text>
            {deal.hasDelivery && <Text style={{ fontSize: 10 }}>🚚</Text>}
          </View>

          {/* Инфо */}
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: 'bold', color: isHidden ? '#999' : '#222', fontSize: 15 }} numberOfLines={1}>
              {deal.title}
            </Text>
            <Text style={{ color: '#999', fontSize: 13 }}>{deal.category} · {deal.city}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={{ color: '#FF4500', fontWeight: 'bold' }}>{Number(deal.newPrice).toLocaleString()} ₸</Text>
              <Text style={{ color: '#aaa', fontSize: 12, textDecorationLine: 'line-through' }}>{Number(deal.oldPrice).toLocaleString()} ₸</Text>
            </View>
          </View>

          {/* Статус */}
          <View style={{ backgroundColor: isHidden ? '#f0f0f0' : '#FFF0EB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ color: isHidden ? '#999' : '#FF4500', fontSize: 11, fontWeight: 'bold' }}>
              {isHidden ? '🙈 Скрыто' : '✅ Активно'}
            </Text>
          </View>
        </View>

        {/* Теги */}
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {deal.sizes?.length > 0 && (
            <View style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ color: '#666', fontSize: 11 }}>📏 {deal.sizes.length} размеров</Text>
            </View>
          )}
          {deal.colorVariants?.length > 0 && (
            <View style={{ backgroundColor: '#f0f0f0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ color: '#666', fontSize: 11 }}>🎨 {deal.colorVariants.length} цветов</Text>
            </View>
          )}
          {deal.foodTags?.length > 0 && (
            <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ color: '#666', fontSize: 11 }}>{deal.foodTags[0]}</Text>
            </View>
          )}
          {deal.hasBooking && (
            <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ color: '#4CAF50', fontSize: 11 }}>🗓 Бронь</Text>
            </View>
          )}
        </View>

        {/* Кнопки управления */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {/* Скрыть/Показать */}
          <TouchableOpacity
            onPress={onToggle}
            disabled={isToggling}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isHidden ? '#E8F5E9' : '#f0f0f0', borderRadius: 10, paddingVertical: 10, gap: 6 }}
          >
            {isToggling
              ? <ActivityIndicator size="small" color="#666" />
              : <>
                  <Ionicons name={isHidden ? 'eye' : 'eye-off'} size={16} color={isHidden ? '#4CAF50' : '#666'} />
                  <Text style={{ color: isHidden ? '#4CAF50' : '#666', fontWeight: '600', fontSize: 13 }}>
                    {isHidden ? 'Показать' : 'Скрыть'}
                  </Text>
                </>
            }
          </TouchableOpacity>

          {/* Удалить */}
          <TouchableOpacity
            onPress={onDelete}
            disabled={isDeleting}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF0EB', borderRadius: 10, paddingVertical: 10, gap: 6, borderWidth: 1, borderColor: '#FF4500' }}
          >
            {isDeleting
              ? <ActivityIndicator size="small" color="#FF4500" />
              : <>
                  <Ionicons name="trash" size={16} color="#FF4500" />
                  <Text style={{ color: '#FF4500', fontWeight: '600', fontSize: 13 }}>Удалить</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
