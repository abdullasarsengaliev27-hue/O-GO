import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { styles } from '../components/styles';

const ADMIN_PASSWORD = 'ogoadmin2024';

const CATEGORY_LABELS: Record<string, string> = {
  clothing: '👕 Одежда и Обувь',
  food: '🍔 Еда и рестораны',
  tech: '💻 Техника',
  beauty: '💄 Косметика',
  general: '📦 Магазин',
};

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const [applications, setApplications] = useState<any[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [promotionRequests, setPromotionRequests] = useState<any[]>([]);

  {promotionRequests.map((p: any) => (
    <View key={p.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2 }}>
      <Text style={{ fontWeight: '700', fontSize: 15, color: '#1a1a1a' }}>{p.promoTitle}</Text>
      <Text style={{ color: '#999', fontSize: 13 }}>✉️ {p.sellerEmail}</Text>
      <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 14, marginTop: 4 }}>
        {p.planLabel} · {p.price?.toLocaleString()} ₸
      </Text>
      {p.dealTitle && (
        <Text style={{ color: '#666', fontSize: 13 }}>🎯 Публикация: {p.dealTitle}</Text>
      )}
      {p.receiptImage && (
        <View style={{ marginTop: 10, marginBottom: 10 }}>
          <Text style={{ fontWeight: '700', color: '#FF9800', marginBottom: 6 }}>📸 Чек об оплате:</Text>
          <Image source={{ uri: p.receiptImage }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="contain" />
        </View>
      )}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#4CAF50', borderRadius: 10, padding: 12, alignItems: 'center' }}
          onPress={async () => {
            const hours = p.planId?.includes('24h') ? 24 : p.planId?.includes('3d') ? 72 : 168;
            const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
            await updateDoc(doc(db, 'promotions', p.id), {
              status: 'approved',
              expiresAt,
              approvedAt: new Date().toISOString(),
            });
            // Если турбо-буст — помечаем скидку
            if (p.type === 'turbo' && p.dealId) {
              await updateDoc(doc(db, 'deals', p.dealId), {
                isBoosted: true,
                boostedUntil: expiresAt,
              });
            }
            Alert.alert('✅ Продвижение активировано!');
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>✅ Одобрить</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: '#FFF0EB', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#FF4500' }}
          onPress={async () => {
            await updateDoc(doc(db, 'promotions', p.id), { status: 'rejected' });
            Alert.alert('❌ Отклонено');
          }}
        >
          <Text style={{ color: '#FF4500', fontWeight: '700' }}>❌ Отклонить</Text>
        </TouchableOpacity>
      </View>
    </View>
  ))}

  useEffect(() => {
    return onSnapshot(collection(db, 'sellerApplications'), snap => {
      setApplications(snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));      setLoading(false);
    });
  }, []);

  const approveApplication = async (app: any) => {
    setProcessingId(app.id);
    try {
      // Сохраняем одобренную заявку — продавец сам создаст аккаунт
      await updateDoc(doc(db, 'sellerApplications', app.id), {
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedPassword: newPassword || 'seller123',
      });
  
      // Создаём запись в approvedSellers — продавец войдёт по email
      await setDoc(doc(db, 'approvedSellers', app.email), {
        email: app.email,
        storeName: app.storeName,
        storeCategory: app.storeCategory,
        storeAddress: app.address,
        storePhone: app.phone,
        storeDescription: app.description,
        storeLogo: app.storePhoto || null,
        city: app.city,
        approvedAt: new Date().toISOString(),
      });
  
      setSelectedApp(null);
      setNewPassword('');
      Alert.alert(
        '✅ Заявка одобрена!',
        `Продавец может зарегистрироваться используя email:\n${app.email}\n\nОн увидит уведомление при входе.`
      );
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
    setProcessingId(null);
  };

  
  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'promotions'), where('status', '==', 'pending')),
      snap => setPromotionRequests(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const rejectApplication = (app: any) => {
    Alert.alert('Отклонить заявку?', `${app.storeName} — ${app.fullName}`, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отклонить', style: 'destructive', onPress: async () => {
        await updateDoc(doc(db, 'sellerApplications', app.id), {
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
        });
      }}
    ]);
  };

  const filtered = applications.filter(a => a.status === filter);
  const pendingCount = applications.filter(a => a.status === 'pending').length;

  if (selectedApp) return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#FF4500', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
          <View style={{ gap: 8 }}>
            <Text style={{ color: '#666' }}>👤 {selectedApp.fullName}</Text>
            <Text style={{ color: '#666' }}>📱 {selectedApp.phone}</Text>
            <Text style={{ color: '#666' }}>✉️ {selectedApp.email}</Text>
            <Text style={{ color: '#666' }}>📍 {selectedApp.city}, {selectedApp.address}</Text>
            <Text style={{ color: '#666' }}>{CATEGORY_LABELS[selectedApp.storeCategory] || selectedApp.storeCategory}</Text>
            {selectedApp.description && <Text style={{ color: '#666' }}>💬 {selectedApp.description}</Text>}
          </View>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 12 }}>🔐 Создать пароль для продавца</Text>
          <TextInput
            style={styles.input}
            placeholder="Минимум 6 символов"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            placeholderTextColor="#aaa"
          />
          <Text style={{ color: '#999', fontSize: 12 }}>Продавец войдёт с email: {selectedApp.email}</Text>
        </View>

        {processingId === selectedApp.id
          ? <ActivityIndicator size="large" color="#FF4500" />
          : (
            <>
              <TouchableOpacity style={[styles.bigBtn, { marginBottom: 10 }]} onPress={() => approveApplication(selectedApp)}>
                <Text style={styles.bigBtnText}>✅ Одобрить и создать аккаунт</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#fff', borderWidth: 2, borderColor: '#f44336' }]} onPress={() => { rejectApplication(selectedApp); setSelectedApp(null); }}>
                <Text style={[styles.bigBtnText, { color: '#f44336' }]}>❌ Отклонить заявку</Text>
              </TouchableOpacity>
            </>
          )
        }
      </ScrollView>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#222', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>🛡 Панель администратора</Text>
        {pendingCount > 0 && (
          <View style={{ backgroundColor: '#FF4500', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{pendingCount} новых</Text>
          </View>
        )}
      </View>

     

{/* Вкладки */}
<View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
  {(['pending', 'approved', 'rejected'] as const).map(f => (
    <TouchableOpacity key={f} onPress={() => setFilter(f)} style={{ flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: filter === f ? '#FF4500' : '#fff', alignItems: 'center' }}>
      <Text style={{ color: filter === f ? '#fff' : '#666', fontWeight: '600', fontSize: 12 }}>
        {f === 'pending' ? `⏳ Новые (${pendingCount})` : f === 'approved' ? '✅ Одобрены' : '❌ Отклонены'}
      </Text>
    </TouchableOpacity>
  ))}
</View>

      {loading ? <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={{ padding: 12 }}>
          {filtered.length === 0 ? (
            <View style={[styles.center, { marginTop: 40 }]}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
              <Text style={{ color: '#aaa' }}>Нет заявок</Text>
            </View>
          ) : filtered.map(app => (
            <TouchableOpacity key={app.id} onPress={() => setSelectedApp(app)} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16 }}>{app.storeName}</Text>
                  <Text style={{ color: '#999', fontSize: 13, marginTop: 2 }}>👤 {app.fullName}</Text>
                  <Text style={{ color: '#999', fontSize: 13 }}>📍 {app.city}</Text>
                  <Text style={{ color: '#666', fontSize: 13 }}>{CATEGORY_LABELS[app.storeCategory] || app.storeCategory}</Text>
                </View>
                <View>
                  <View style={{ backgroundColor: app.status === 'pending' ? '#FFF9E6' : app.status === 'approved' ? '#E8F5E9' : '#FFEBEE', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                    <Text style={{ color: app.status === 'pending' ? '#FF9800' : app.status === 'approved' ? '#4CAF50' : '#f44336', fontWeight: 'bold', fontSize: 12 }}>
                      {app.status === 'pending' ? '⏳ Новая' : app.status === 'approved' ? '✅ Одобрена' : '❌ Отклонена'}
                    </Text>
                  </View>
                  <Text style={{ color: '#ccc', fontSize: 11, marginTop: 6, textAlign: 'right' }}>
                    {new Date(app.createdAt).toLocaleDateString('ru-RU')}
                  </Text>
                </View>
              </View>
              {app.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  <TouchableOpacity onPress={() => setSelectedApp(app)} style={{ flex: 1, backgroundColor: '#FF4500', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Рассмотреть →</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
