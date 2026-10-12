import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, doc, updateDoc, setDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { styles } from '../components/styles';

const CATEGORY_LABELS: Record<string, string> = {
  clothing: '👕 Одежда и Обувь',
  food: '🍔 Еда и рестораны',
  tech: '💻 Техника',
  beauty: '💄 Косметика',
  general: '📦 Магазин',
};

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sellers' | 'promotions' | 'deals' | 'orders'>('dashboard');
  const [applications, setApplications] = useState<any[]>([]);
  const [promotionRequests, setPromotionRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allDeals, setAllDeals] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const unsubs: any[] = [];
    unsubs.push(onSnapshot(collection(db, 'sellerApplications'), snap => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
      setLoading(false);
    }));
    unsubs.push(onSnapshot(query(collection(db, 'promotions'), where('status', '==', 'pending')), snap => {
      setPromotionRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    unsubs.push(onSnapshot(collection(db, 'users'), snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    unsubs.push(onSnapshot(collection(db, 'deals'), snap => {
      setAllDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    unsubs.push(onSnapshot(collection(db, 'orders'), snap => {
      setAllOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));
    return () => unsubs.forEach(u => u());
  }, []);

  const sellers = allUsers.filter(u => u.role === 'seller');
  const buyers = allUsers.filter(u => u.role === 'buyer');
  const activeOrders = allOrders.filter(o => o.status !== 'delivered' && o.status !== 'buyer_confirmed');
  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const promotionCount = promotionRequests.length;

  const approveApplication = async (app: any) => {
    if (!newPassword || newPassword.length < 6) return Alert.alert('Ошибка', 'Введи пароль минимум 6 символов');
    setProcessingId(app.id);
    try {
      const res = await createUserWithEmailAndPassword(auth, app.email, newPassword);
      await setDoc(doc(db, 'users', res.user.uid), {
        email: app.email, role: 'seller',
        storeName: app.storeName, storeAddress: app.address,
        storeCategory: app.storeCategory, storePhone: app.phone,
        storeDescription: app.description, storeLogo: app.storePhoto || null,
        city: app.city, isApproved: true,
        createdAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'sellerApplications', app.id), { status: 'approved', approvedAt: new Date().toISOString() });
      await setDoc(doc(db, 'approvedSellers', app.email), {
        email: app.email, storeName: app.storeName,
        storeCategory: app.storeCategory, storeAddress: app.address,
        storePhone: app.phone, storeDescription: app.description,
        storeLogo: app.storePhoto || null, city: app.city,
        approvedAt: new Date().toISOString(),
      });
      setSelectedApp(null); setNewPassword('');
      Alert.alert('✅ Продавец одобрен!', `Email: ${app.email}\nПароль: ${newPassword}`);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setProcessingId(null);
  };

  const rejectApplication = (app: any) => {
    Alert.alert('Отклонить заявку?', app.storeName, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отклонить', style: 'destructive', onPress: async () => {
        await updateDoc(doc(db, 'sellerApplications', app.id), { status: 'rejected', rejectedAt: new Date().toISOString() });
      }}
    ]);
  };

  const approvePromotion = async (p: any) => {
    const hours = p.planId?.includes('24h') ? 24 : p.planId?.includes('3d') ? 72 : 168;
    const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    try {
      await updateDoc(doc(db, 'promotions', p.id), { status: 'approved', expiresAt, approvedAt: new Date().toISOString() });
      if (p.type === 'turbo') {
        if (p.dealId) {
          await updateDoc(doc(db, 'deals', p.dealId), { isBoosted: true, boostedUntil: expiresAt });
        } else {
          const dealsSnap = await getDocs(query(collection(db, 'deals'), where('sellerId', '==', p.sellerId)));
          for (const d of dealsSnap.docs) {
            await updateDoc(doc(db, 'deals', d.id), { isBoosted: true, boostedUntil: expiresAt });
          }
        }
      }
      Alert.alert('✅ Активировано!', `${p.promoTitle} на ${p.planLabel}`);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
  };

  const rejectPromotion = async (p: any) => {
    Alert.alert('Отклонить?', p.promoTitle, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отклонить', style: 'destructive', onPress: async () => {
        await updateDoc(doc(db, 'promotions', p.id), { status: 'rejected' });
      }}
    ]);
  };

  const toggleBlockSeller = async (seller: any) => {
    const isBlocked = seller.isBlocked;
    Alert.alert(
      isBlocked ? 'Разблокировать?' : 'Заблокировать?',
      `${seller.storeName || seller.email}`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: isBlocked ? 'Разблокировать' : 'Заблокировать', style: 'destructive', onPress: async () => {
          await updateDoc(doc(db, 'users', seller.id), { isBlocked: !isBlocked });
          Alert.alert(isBlocked ? '✅ Разблокирован' : '🚫 Заблокирован');
        }}
      ]
    );
  };

  const deleteDeal = (deal: any) => {
    Alert.alert('Удалить скидку?', deal.title, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: async () => {
        await deleteDoc(doc(db, 'deals', deal.id));
        Alert.alert('✅ Скидка удалена');
      }}
    ]);
  };

  if (selectedApp) return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#222', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={() => { setSelectedApp(null); setNewPassword(''); }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Рассмотреть заявку</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {selectedApp.storePhoto && (
          <Image source={{ uri: selectedApp.storePhoto }} style={{ width: '100%', height: 200, borderRadius: 14, marginBottom: 16 }} resizeMode="cover" />
        )}
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>{selectedApp.storeName}</Text>
          <Text style={{ color: '#666' }}>👤 {selectedApp.fullName}</Text>
          <Text style={{ color: '#666' }}>📱 {selectedApp.phone}</Text>
          <Text style={{ color: '#666' }}>✉️ {selectedApp.email}</Text>
          <Text style={{ color: '#666' }}>📍 {selectedApp.city}, {selectedApp.address}</Text>
          <Text style={{ color: '#666' }}>{CATEGORY_LABELS[selectedApp.storeCategory] || selectedApp.storeCategory}</Text>
          {selectedApp.description && <Text style={{ color: '#666' }}>💬 {selectedApp.description}</Text>}
        </View>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 12 }}>🔐 Создать пароль</Text>
          <TextInput style={styles.input} placeholder="Минимум 6 символов" value={newPassword} onChangeText={setNewPassword} secureTextEntry placeholderTextColor="#aaa" />
          <Text style={{ color: '#999', fontSize: 12 }}>Email: {selectedApp.email}</Text>
        </View>
        {processingId === selectedApp.id
          ? <ActivityIndicator size="large" color="#FF4500" />
          : <>
              <TouchableOpacity style={[styles.bigBtn, { marginBottom: 10 }]} onPress={() => approveApplication(selectedApp)}>
                <Text style={styles.bigBtnText}>✅ Одобрить и создать аккаунт</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#fff', borderWidth: 2, borderColor: '#f44336' }]} onPress={() => { rejectApplication(selectedApp); setSelectedApp(null); }}>
                <Text style={[styles.bigBtnText, { color: '#f44336' }]}>❌ Отклонить заявку</Text>
              </TouchableOpacity>
            </>
        }
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#222', paddingTop: 16, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1, marginLeft: 12 }}>🛡 Панель администратора</Text>
        {(pendingCount + promotionCount) > 0 && (
          <View style={{ backgroundColor: '#FF4500', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{pendingCount + promotionCount}</Text>
          </View>
        )}
      </View>

      {/* Вкладки */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#222', paddingBottom: 12 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
        {[
          { id: 'dashboard', label: '📊 Дашборд' },
          { id: 'sellers', label: `🏪 Продавцы ${pendingCount > 0 ? `(${pendingCount})` : ''}` },
          { id: 'promotions', label: `⚡ Продвижение ${promotionCount > 0 ? `(${promotionCount})` : ''}` },
          { id: 'deals', label: '🏷 Скидки' },
          { id: 'orders', label: '📦 Заказы' },
        ].map(tab => (
          <TouchableOpacity
            key={tab.id}
            onPress={() => setActiveTab(tab.id as any)}
            style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: activeTab === tab.id ? '#FF4500' : 'rgba(255,255,255,0.15)' }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Дашборд */}
      {activeTab === 'dashboard' && (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 16 }}>📊 Общая статистика</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 3 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#FF4500' }}>{buyers.length}</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Покупателей</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 3 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#3B82F6' }}>{sellers.length}</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Продавцов</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 3 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#22C55E' }}>{allDeals.filter(d => !d.isHidden).length}</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Активных скидок</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 3 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#F59E0B' }}>{allOrders.length}</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Всего заказов</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 3 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#9C27B0' }}>{activeOrders.length}</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Активных заказов</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 3 }}>
              <Text style={{ fontSize: 32, fontWeight: '900', color: '#EF4444' }}>{pendingCount + promotionCount}</Text>
              <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>Новых заявок</Text>
            </View>
          </View>

          {/* Уведомления о новых заявках */}
          {pendingCount > 0 && (
            <TouchableOpacity onPress={() => setActiveTab('sellers')} style={{ backgroundColor: '#FFF9E6', borderRadius: 16, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#FFD700' }}>
              <Text style={{ fontSize: 28 }}>🏪</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: '#1a1a1a' }}>Новые заявки продавцов</Text>
                <Text style={{ color: '#999', fontSize: 13 }}>{pendingCount} заявок ожидают рассмотрения</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF4500" />
            </TouchableOpacity>
          )}
          {promotionCount > 0 && (
            <TouchableOpacity onPress={() => setActiveTab('promotions')} style={{ backgroundColor: '#FFF0EB', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#FF4500' }}>
              <Text style={{ fontSize: 28 }}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '800', color: '#1a1a1a' }}>Заявки на продвижение</Text>
                <Text style={{ color: '#999', fontSize: 13 }}>{promotionCount} заявок ожидают подтверждения</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF4500" />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Продавцы */}
      {activeTab === 'sellers' && (
        <>
          <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
            {(['pending', 'approved', 'rejected'] as const).map(f => (
              <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: filter === f ? '#FF4500' : '#fff', alignItems: 'center' }}>
                <Text style={{ color: filter === f ? '#fff' : '#666', fontWeight: '600', fontSize: 11 }}>
                  {f === 'pending' ? `⏳ Новые (${pendingCount})` : f === 'approved' ? '✅ Одобрены' : '❌ Отклонены'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Активные продавцы с блокировкой */}
          {filter === 'approved' && (
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 15, marginBottom: 10 }}>Активные продавцы ({sellers.length})</Text>
              {sellers.map(seller => (
                <View key={seller.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, opacity: seller.isBlocked ? 0.6 : 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>{seller.storeName || seller.email}</Text>
                      <Text style={{ color: '#999', fontSize: 12 }}>✉️ {seller.email}</Text>
                      <Text style={{ color: '#999', fontSize: 12 }}>📍 {seller.city}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleBlockSeller(seller)}
                      style={{ backgroundColor: seller.isBlocked ? '#E8F5E9' : '#FFEBEE', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
                    >
                      <Text style={{ color: seller.isBlocked ? '#4CAF50' : '#f44336', fontWeight: '700', fontSize: 12 }}>
                        {seller.isBlocked ? '✅ Разблокировать' : '🚫 Заблокировать'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {filter !== 'approved' && (
            loading ? <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 40 }} /> : (
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {applications.filter(a => a.status === filter).length === 0 ? (
                  <View style={[styles.center, { marginTop: 40 }]}>
                    <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
                    <Text style={{ color: '#aaa' }}>Нет заявок</Text>
                  </View>
                ) : applications.filter(a => a.status === filter).map(app => (
                  <TouchableOpacity key={app.id} onPress={() => setSelectedApp(app)} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16 }}>{app.storeName}</Text>
                        <Text style={{ color: '#999', fontSize: 13 }}>👤 {app.fullName}</Text>
                        <Text style={{ color: '#999', fontSize: 13 }}>📍 {app.city}</Text>
                      </View>
                      <View style={{ backgroundColor: app.status === 'pending' ? '#FFF9E6' : '#FFEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start' }}>
                        <Text style={{ color: app.status === 'pending' ? '#FF9800' : '#f44336', fontWeight: 'bold', fontSize: 12 }}>
                          {app.status === 'pending' ? '⏳ Новая' : '❌ Отклонена'}
                        </Text>
                      </View>
                    </View>
                    {app.status === 'pending' && (
                      <TouchableOpacity onPress={() => setSelectedApp(app)} style={{ marginTop: 10, backgroundColor: '#FF4500', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '600' }}>Рассмотреть →</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )
          )}
        </>
      )}

      {/* Продвижение */}
      {activeTab === 'promotions' && (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {promotionRequests.length === 0 ? (
            <View style={[styles.center, { marginTop: 40 }]}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>⚡</Text>
              <Text style={{ color: '#aaa', fontSize: 16 }}>Нет заявок на продвижение</Text>
            </View>
          ) : promotionRequests.map((p: any) => (
            <View key={p.id} style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, elevation: 3 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontWeight: '800', fontSize: 16, color: '#1a1a1a' }}>{p.promoTitle}</Text>
                <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ color: '#FF9800', fontWeight: '700', fontSize: 12 }}>⏳ Ожидает</Text>
                </View>
              </View>
              <Text style={{ color: '#666', fontSize: 13 }}>✉️ {p.sellerEmail}</Text>
              <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 15, marginTop: 4 }}>{p.planLabel} · {p.price?.toLocaleString()} ₸</Text>
              {p.dealTitle && (
                <View style={{ backgroundColor: '#FFF0EB', borderRadius: 10, padding: 8, marginTop: 6 }}>
                  <Text style={{ color: '#FF4500', fontSize: 13 }}>🎯 {p.dealTitle}</Text>
                </View>
              )}
              {p.receiptImage && (
                <View style={{ marginTop: 12, marginBottom: 8 }}>
                  <Text style={{ fontWeight: '700', color: '#FF9800', marginBottom: 6 }}>📸 Чек:</Text>
                  <Image source={{ uri: p.receiptImage }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="contain" />
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#4CAF50', borderRadius: 12, padding: 14, alignItems: 'center' }} onPress={() => approvePromotion(p)}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>✅ Одобрить</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{ flex: 1, backgroundColor: '#FFF0EB', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 2, borderColor: '#f44336' }} onPress={() => rejectPromotion(p)}>
                  <Text style={{ color: '#f44336', fontWeight: '800' }}>❌ Отклонить</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Все скидки */}
      {activeTab === 'deals' && (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 15, marginBottom: 10 }}>
            Все скидки ({allDeals.length})
          </Text>
          {allDeals.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map(deal => (
            <View key={deal.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {deal.imageUrl
                  ? <Image source={{ uri: deal.imageUrl }} style={{ width: 52, height: 52 }} resizeMode="cover" />
                  : <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 12 }}>-{deal.discount}%</Text>
                }
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 14 }} numberOfLines={1}>{deal.title}</Text>
                <Text style={{ color: '#999', fontSize: 12 }}>🏪 {deal.store} · 📍 {deal.city}</Text>
                <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 13 }}>{Number(deal.newPrice).toLocaleString()} ₸ · -{deal.discount}%</Text>
              </View>
              <TouchableOpacity onPress={() => deleteDeal(deal)} style={{ padding: 8 }}>
                <Ionicons name="trash-outline" size={20} color="#f44336" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Все заказы */}
      {activeTab === 'orders' && (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 15, marginBottom: 10 }}>
            Все заказы ({allOrders.length}) · Активных: {activeOrders.length}
          </Text>
          {allOrders.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).map(order => (
            <View key={order.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 14 }} numberOfLines={1}>{order.dealTitle}</Text>
                  <Text style={{ color: '#999', fontSize: 12 }}>👤 {order.buyerEmail}</Text>
                  <Text style={{ color: '#999', fontSize: 12 }}>🏪 {order.storeName}</Text>
                  <Text style={{ color: '#999', fontSize: 12 }}>📍 {order.city}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 15 }}>{Number(order.price).toLocaleString()} ₸</Text>
                  <View style={{ backgroundColor: order.status === 'delivered' || order.status === 'buyer_confirmed' ? '#E8F5E9' : '#FFF9E6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                    <Text style={{ color: order.status === 'delivered' || order.status === 'buyer_confirmed' ? '#4CAF50' : '#FF9800', fontWeight: '700', fontSize: 11 }}>
                      {order.status === 'buyer_confirmed' ? '✅ Завершён' : order.status === 'delivered' ? '🎉 Доставлен' : order.status === 'sent' ? '🚚 В пути' : order.status === 'packed' ? '📦 Упакован' : order.status === 'accepted' ? '✅ Принят' : '⏳ Ожидает'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={{ color: '#ccc', fontSize: 11, marginTop: 6 }}>#{order.id?.slice(-6).toUpperCase()} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : ''}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
