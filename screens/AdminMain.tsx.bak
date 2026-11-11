import { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc, getDocs, addDoc, query, where,
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CATEGORY_LABELS: Record<string, string> = {
  clothing: '👕 Одежда и Обувь',
  food: '🍔 Еда и рестораны',
  tech: '💻 Техника',
  beauty: '💄 Косметика',
  general: '📦 Магазин',
};

type Tab = 'dashboard' | 'sellers' | 'promotions' | 'deals' | 'orders' | 'support';
type SellerFilter = 'pending' | 'approved' | 'rejected' | 'active';

const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const ORDER_STATUS: Record<string, string> = {
  pending: '⏳ Ожидает', accepted: '✅ Принят', packed: '📦 Упакован', sent: '🚚 В пути',
  delivered: '🎉 Доставлен', buyer_confirmed: '✅ Завершён', awaiting_payment_confirmation: '💳 Ждёт оплаты',
};

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<Tab>('dashboard');
  const [sellerFilter, setSellerFilter] = useState<SellerFilter>('pending');
  const [promoFilter, setPromoFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [supportFilter, setSupportFilter] = useState<'pending' | 'resolved'>('pending');
  const [search, setSearch] = useState('');

  const [applications, setApplications] = useState<any[]>([]);
  const [promotions, setPromotions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [deals, setDeals] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [support, setSupport] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  useEffect(() => {
    const byDate = (k: string) => (a: any, b: any) => new Date(b[k] || 0).getTime() - new Date(a[k] || 0).getTime();
    const unsubs = [
      onSnapshot(collection(db, 'sellerApplications'), s => {
        setApplications(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate('createdAt')));
        setLoading(false);
      }),
      onSnapshot(collection(db, 'promotions'), s =>
        setPromotions(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate('requestedAt')))),
      onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'deals'), s =>
        setDeals(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate('createdAt')))),
      onSnapshot(collection(db, 'orders'), s =>
        setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate('createdAt')))),
      onSnapshot(collection(db, 'support'), s =>
        setSupport(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate('createdAt')))),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // ===== Производные данные =====
  const sellers = useMemo(() => users.filter(u => u.role === 'seller'), [users]);
  const buyers = useMemo(() => users.filter(u => u.role === 'buyer'), [users]);
  const pendingApps = applications.filter(a => a.status === 'pending');
  const approvedApps = applications.filter(a => a.status === 'approved');
  const rejectedApps = applications.filter(a => a.status === 'rejected');
  const pendingPromos = promotions.filter(p => p.status === 'pending');
  const pendingSupport = support.filter(s => s.status !== 'resolved');
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'buyer_confirmed');
  const totalAttention = pendingApps.length + pendingPromos.length + pendingSupport.length;

  const q = search.trim().toLowerCase();
  const match = (...vals: any[]) => !q || vals.some(v => String(v || '').toLowerCase().includes(q));

  const isRegistered = (email?: string) =>
    users.some(u => (u.email || '').toLowerCase() === (email || '').toLowerCase() && u.role === 'seller');

  // ===== Действия: заявки продавцов =====
  const approveApplication = async (app: any) => {
    setBusy(true);
    try {
      const email = (app.email || '').trim();
      await setDoc(doc(db, 'approvedSellers', email), {
        email,
        storeName: app.storeName,
        storeCategory: app.storeCategory,
        storeAddress: app.address,
        storePhone: app.phone,
        storeDescription: app.description || '',
        storeLogo: app.storePhoto || null,
        city: app.city,
        approvedAt: new Date().toISOString(),
      });
      await updateDoc(doc(db, 'sellerApplications', app.id), {
        status: 'approved', approvedAt: new Date().toISOString(), rejectReason: null,
      });
      setSelectedApp(null);
      Alert.alert('✅ Заявка одобрена', `Продавец ${email} может зарегистрироваться: «Войти как продавец → Войти в кабинет → Зарегистрироваться».`);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setBusy(false);
  };

  const rejectApplication = async (app: any) => {
    if (!rejectReason.trim()) return Alert.alert('Укажи причину', 'Напиши коротко, почему отказываешь.');
    setBusy(true);
    try {
      await updateDoc(doc(db, 'sellerApplications', app.id), {
        status: 'rejected', rejectedAt: new Date().toISOString(), rejectReason: rejectReason.trim(),
      });
      // Если раньше был одобрен — закрываем доступ
      await deleteDoc(doc(db, 'approvedSellers', (app.email || '').trim())).catch(() => {});
      setSelectedApp(null); setRejectReason('');
      Alert.alert('❌ Заявка отклонена');
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setBusy(false);
  };

  // ===== Действия: продавцы =====
  const setSellerDealsHidden = async (sellerId: string, hide: boolean) => {
    const snap = await getDocs(query(collection(db, 'deals'), where('sellerId', '==', sellerId)));
    for (const d of snap.docs) {
      const data: any = d.data();
      if (hide) {
        if (!data.isHidden) await updateDoc(d.ref, { isHidden: true, hiddenByAdmin: true });
      } else if (data.hiddenByAdmin) {
        await updateDoc(d.ref, { isHidden: false, hiddenByAdmin: false });
      }
    }
  };

  const toggleBlock = (seller: any) => {
    const blocking = !seller.isBlocked;
    Alert.alert(
      blocking ? 'Заблокировать продавца?' : 'Разблокировать продавца?',
      blocking
        ? `${seller.storeName || seller.email}\nВсе его скидки будут скрыты.`
        : `${seller.storeName || seller.email}\nСкрытые администратором скидки вернутся.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: blocking ? 'Заблокировать' : 'Разблокировать', style: blocking ? 'destructive' : 'default', onPress: async () => {
          setBusy(true);
          try {
            await updateDoc(doc(db, 'users', seller.id), { isBlocked: blocking, blockedAt: blocking ? new Date().toISOString() : null });
            await setSellerDealsHidden(seller.id, blocking);
            setSelectedSeller((p: any) => p ? { ...p, isBlocked: blocking } : p);
          } catch (e: any) { Alert.alert('Ошибка', e.message); }
          setBusy(false);
        }},
      ]
    );
  };

  const unlinkSeller = (seller: any) => {
    Alert.alert(
      'Отвязать продавца?',
      `${seller.storeName || seller.email}\n\nПрава продавца будут отозваны, аккаунт станет обычным покупательским. Скидки скроются, доступ в список одобренных закроется.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Отвязать', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            await setSellerDealsHidden(seller.id, true);
            await updateDoc(doc(db, 'users', seller.id), { role: 'buyer', isApproved: false, unlinkedAt: new Date().toISOString() });
            if (seller.email) await deleteDoc(doc(db, 'approvedSellers', seller.email)).catch(() => {});
            const app = applications.find(a => (a.email || '').toLowerCase() === (seller.email || '').toLowerCase());
            if (app) await updateDoc(doc(db, 'sellerApplications', app.id), { status: 'rejected', rejectReason: 'Доступ отозван администратором', rejectedAt: new Date().toISOString() });
            setSelectedSeller(null);
            Alert.alert('🔓 Продавец отвязан');
          } catch (e: any) { Alert.alert('Ошибка', e.message); }
          setBusy(false);
        }},
      ]
    );
  };

  const deleteSeller = (seller: any) => {
    Alert.alert(
      '🗑 Удалить продавца?',
      `${seller.storeName || seller.email}\n\nБудут удалены: профиль, все его скидки, доступ в список одобренных.\n\nЗапись в Firebase Authentication останется — удали её вручную в консоли, если нужно.\n\nДействие необратимо.`,
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Удалить навсегда', style: 'destructive', onPress: async () => {
          setBusy(true);
          try {
            const snap = await getDocs(query(collection(db, 'deals'), where('sellerId', '==', seller.id)));
            for (const d of snap.docs) await deleteDoc(d.ref);
            if (seller.email) await deleteDoc(doc(db, 'approvedSellers', seller.email)).catch(() => {});
            const app = applications.find(a => (a.email || '').toLowerCase() === (seller.email || '').toLowerCase());
            if (app) await updateDoc(doc(db, 'sellerApplications', app.id), { status: 'rejected', rejectReason: 'Аккаунт удалён администратором', rejectedAt: new Date().toISOString() });
            await deleteDoc(doc(db, 'users', seller.id));
            setSelectedSeller(null);
            Alert.alert('🗑 Продавец удалён');
          } catch (e: any) { Alert.alert('Ошибка', e.message); }
          setBusy(false);
        }},
      ]
    );
  };

  // ===== Действия: продвижение =====
  const approvePromotion = async (p: any) => {
    setBusy(true);
    try {
      let hours = 24;
      if (p.planId?.includes('3d')) hours = 72;
      else if (p.planId?.includes('7d')) hours = 168;
      const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

      await updateDoc(doc(db, 'promotions', p.id), { status: 'approved', expiresAt, approvedAt: new Date().toISOString() });

      if (p.type === 'turbo') {
        if (p.dealId) {
          await setDoc(doc(db, 'deals', p.dealId), { isBoosted: true, boostedUntil: expiresAt }, { merge: true });
        } else {
          const snap = await getDocs(query(collection(db, 'deals'), where('sellerId', '==', p.sellerId)));
          for (const d of snap.docs) await setDoc(d.ref, { isBoosted: true, boostedUntil: expiresAt }, { merge: true });
        }
      } else if (p.type === 'map') {
        await setDoc(doc(db, 'users', p.sellerId), { mapHighlighted: true, mapHighlightedUntil: expiresAt }, { merge: true });
      } else if (p.type === 'banner') {
        await setDoc(doc(db, 'users', p.sellerId), { hasBanner: true, bannerUntil: expiresAt, bannerImage: p.bannerImage || null }, { merge: true });
      }
      Alert.alert('✅ Активировано', `${p.promoTitle}\nДо ${fmtDate(expiresAt)}`);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setBusy(false);
  };

  const rejectPromotion = (p: any) =>
    Alert.alert('Отклонить продвижение?', p.promoTitle, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отклонить', style: 'destructive', onPress: () => updateDoc(doc(db, 'promotions', p.id), { status: 'rejected' }) },
    ]);

  // ===== Действия: скидки =====
  const deleteDeal = (deal: any) =>
    Alert.alert('Удалить скидку?', deal.title, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => deleteDoc(doc(db, 'deals', deal.id)) },
    ]);

  const toggleDealHidden = (deal: any) =>
    updateDoc(doc(db, 'deals', deal.id), { isHidden: !deal.isHidden, hiddenByAdmin: !deal.isHidden });

  // ===== Действия: жалобы =====
  const resolveSupport = async (s: any) => {
    const reply = (replyText[s.id] || '').trim();
    try {
      await updateDoc(doc(db, 'support', s.id), {
        status: 'resolved', adminReply: reply || null, resolvedAt: new Date().toISOString(),
      });
      if (s.userId) {
        await addDoc(collection(db, 'notifications'), {
          toUserId: s.userId, type: 'support_reply', title: '🆘 Ответ по вашей жалобе',
          body: reply || 'Ваше обращение рассмотрено.', read: false, createdAt: new Date().toISOString(),
        });
      }
      setReplyText(p => ({ ...p, [s.id]: '' }));
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
  };

  // ===== Мелкие UI-компоненты =====
  const Chip = ({ label, active, onPress, badge }: any) => (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? '#FF4500' : '#fff', borderWidth: 1, borderColor: active ? '#FF4500' : '#eee', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ color: active ? '#fff' : '#555', fontWeight: '700', fontSize: 13 }}>{label}</Text>
      {badge > 0 && (
        <View style={{ backgroundColor: active ? '#fff' : '#FF4500', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 }}>
          <Text style={{ color: active ? '#FF4500' : '#fff', fontSize: 10, fontWeight: '800' }}>{badge}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const Stat = ({ icon, color, bg, value, label, onPress }: any) => (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress} style={{ width: '48.5%', backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 10, elevation: 2 }}>
      <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: bg, justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={{ fontSize: 26, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{label}</Text>
    </TouchableOpacity>
  );

  const Empty = ({ emoji, text }: { emoji: string; text: string }) => (
    <View style={{ alignItems: 'center', paddingVertical: 50 }}>
      <Text style={{ fontSize: 48, marginBottom: 10 }}>{emoji}</Text>
      <Text style={{ color: '#aaa', fontSize: 15 }}>{text}</Text>
    </View>
  );

  const Header = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <View style={{ backgroundColor: '#1a1a1a', paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <TouchableOpacity onPress={onPress} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Ionicons name="arrow-back" size={26} color="#fff" />
      </TouchableOpacity>
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', flex: 1 }}>{title}</Text>
    </View>
  );

  const InfoRow = ({ icon, text }: { icon: any; text?: string }) =>
    text ? (
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 }}>
        <Ionicons name={icon} size={16} color="#FF4500" style={{ marginTop: 2 }} />
        <Text style={{ color: '#444', fontSize: 14, flex: 1 }}>{text}</Text>
      </View>
    ) : null;

  // ===== ДЕТАЛИ ЗАЯВКИ =====
  if (selectedApp) {
    const a = selectedApp;
    const statusColor = a.status === 'approved' ? '#22C55E' : a.status === 'rejected' ? '#EF4444' : '#FF9800';
    const statusLabel = a.status === 'approved' ? '✅ Одобрена' : a.status === 'rejected' ? '❌ Отклонена' : '⏳ На рассмотрении';
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Header title="Заявка продавца" onPress={() => { setSelectedApp(null); setRejectReason(''); }} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {a.storePhoto ? <Image source={{ uri: a.storePhoto }} style={{ width: '100%', height: 200, borderRadius: 16, marginBottom: 14 }} resizeMode="cover" /> : null}
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', flex: 1 }}>{a.storeName}</Text>
              <View style={{ backgroundColor: statusColor + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <Text style={{ color: statusColor, fontWeight: '700', fontSize: 12 }}>{statusLabel}</Text>
              </View>
            </View>
            <InfoRow icon="person" text={a.fullName} />
            <InfoRow icon="call" text={a.phone} />
            <InfoRow icon="mail" text={a.email} />
            <InfoRow icon="location" text={[a.city, a.address].filter(Boolean).join(', ')} />
            <InfoRow icon="pricetag" text={CATEGORY_LABELS[a.storeCategory] || a.storeCategory} />
            <InfoRow icon="chatbubble-outline" text={a.description} />
            <InfoRow icon="time" text={`Подана: ${fmtDate(a.createdAt)}`} />
            {a.status === 'approved' && <InfoRow icon="checkmark-circle" text={`${isRegistered(a.email) ? 'Уже зарегистрирован в приложении' : 'Ещё не зарегистрировался'} · одобрена ${fmtDate(a.approvedAt)}`} />}
            {a.status === 'rejected' && a.rejectReason ? <InfoRow icon="close-circle" text={`Причина: ${a.rejectReason}`} /> : null}
          </View>

          {a.status !== 'approved' && (
            <TouchableOpacity disabled={busy} onPress={() => approveApplication(a)} style={{ backgroundColor: '#22C55E', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 10 }}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>✅ {a.status === 'rejected' ? 'Одобрить повторно' : 'Одобрить'}</Text>}
            </TouchableOpacity>
          )}

          {a.status !== 'rejected' && (
            <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14 }}>
              <Text style={{ fontWeight: '700', color: '#333', marginBottom: 8 }}>Причина отказа</Text>
              <TextInput
                style={{ backgroundColor: '#f8f8f8', borderRadius: 12, padding: 12, minHeight: 70, textAlignVertical: 'top', color: '#1a1a1a', marginBottom: 10 }}
                placeholder="Например: не удалось подтвердить магазин"
                placeholderTextColor="#bbb" value={rejectReason} onChangeText={setRejectReason} multiline
              />
              <TouchableOpacity disabled={busy} onPress={() => rejectApplication(a)} style={{ borderWidth: 2, borderColor: '#EF4444', borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>❌ {a.status === 'approved' ? 'Отозвать одобрение' : 'Отклонить'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ===== ДЕТАЛИ ПРОДАВЦА =====
  if (selectedSeller) {
    const s = users.find(u => u.id === selectedSeller.id) || selectedSeller;
    const sDeals = deals.filter(d => d.sellerId === s.id);
    const sOrders = orders.filter(o => o.sellerId === s.id);
    const sPromos = promotions.filter(p => p.sellerId === s.id);
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <Header title="Продавец" onPress={() => setSelectedSeller(null)} />
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }}>
              <View style={{ width: 64, height: 64, borderRadius: 18, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                {s.storeLogo ? <Image source={{ uri: s.storeLogo }} style={{ width: 64, height: 64 }} /> : <Ionicons name="storefront" size={30} color="#FF4500" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 19, fontWeight: '800', color: '#1a1a1a' }}>{s.storeName || 'Без названия'}</Text>
                <View style={{ alignSelf: 'flex-start', marginTop: 4, backgroundColor: s.isBlocked ? '#FEE2E2' : '#DCFCE7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                  <Text style={{ color: s.isBlocked ? '#DC2626' : '#16A34A', fontWeight: '700', fontSize: 12 }}>{s.isBlocked ? '🚫 Заблокирован' : '✅ Активен'}</Text>
                </View>
              </View>
            </View>
            <InfoRow icon="mail" text={s.email} />
            <InfoRow icon="call" text={s.storePhone} />
            <InfoRow icon="location" text={[s.city, s.storeAddress].filter(Boolean).join(', ')} />
            <InfoRow icon="pricetag" text={CATEGORY_LABELS[s.storeCategory] || s.storeCategory} />
            <InfoRow icon="time" text={`Регистрация: ${fmtDate(s.createdAt)}`} />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <Stat icon="pricetag" color="#FF4500" bg="#FFF0EB" value={sDeals.filter(d => !d.isHidden).length} label={`Активных скидок (всего ${sDeals.length})`} />
            <Stat icon="cube" color="#3B82F6" bg="#EFF6FF" value={sOrders.length} label="Заказов" />
            <Stat icon="eye" color="#8B5CF6" bg="#F3E8FF" value={sDeals.reduce((t, d) => t + (d.viewCount || 0), 0)} label="Просмотров" />
            <Stat icon="flash" color="#F59E0B" bg="#FFFBEB" value={sPromos.filter(p => p.status === 'approved').length} label="Продвижений" />
          </View>

          <TouchableOpacity disabled={busy} onPress={() => toggleBlock(s)} style={{ backgroundColor: s.isBlocked ? '#22C55E' : '#F59E0B', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{s.isBlocked ? '✅ Разблокировать' : '🚫 Заблокировать'}</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={() => unlinkSeller(s)} style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: '#FF4500', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 15 }}>🔓 Отвязать (отозвать права продавца)</Text>
          </TouchableOpacity>
          <TouchableOpacity disabled={busy} onPress={() => deleteSeller(s)} style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: '#EF4444', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 15 }}>🗑 Удалить продавца и его данные</Text>
          </TouchableOpacity>
          {busy && <ActivityIndicator color="#FF4500" />}

          <Text style={{ fontWeight: '800', fontSize: 16, color: '#1a1a1a', marginBottom: 10 }}>Скидки продавца</Text>
          {sDeals.length === 0 ? <Text style={{ color: '#aaa', marginBottom: 20 }}>Скидок нет</Text> : sDeals.map(d => (
            <View key={d.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: d.isHidden ? 0.55 : 1 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1a1a1a' }} numberOfLines={1}>{d.title}</Text>
                <Text style={{ color: '#FF4500', fontSize: 13, fontWeight: '700' }}>{Number(d.newPrice).toLocaleString()} ₸ · -{d.discount}%{d.isHidden ? ' · скрыта' : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteDeal(d)}><Ionicons name="trash-outline" size={20} color="#EF4444" /></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ===== ГЛАВНЫЙ ЭКРАН =====
  const tabs: { id: Tab; label: string; badge: number }[] = [
    { id: 'dashboard', label: '📊 Обзор', badge: 0 },
    { id: 'sellers', label: '🏪 Продавцы', badge: pendingApps.length },
    { id: 'promotions', label: '⚡ Продвижение', badge: pendingPromos.length },
    { id: 'deals', label: '🏷 Скидки', badge: 0 },
    { id: 'orders', label: '📦 Заказы', badge: 0 },
    { id: 'support', label: '🆘 Жалобы', badge: pendingSupport.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#1a1a1a', paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="log-out-outline" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>🛡 Панель администратора</Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>O-GO · управление платформой</Text>
          </View>
          {totalAttention > 0 && (
            <View style={{ backgroundColor: '#FF4500', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{totalAttention} ждут</Text>
            </View>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {tabs.map(t => (
            <TouchableOpacity key={t.id} onPress={() => { setTab(t.id); setSearch(''); }} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: tab === t.id ? '#FF4500' : 'rgba(255,255,255,0.12)', flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t.label}</Text>
              {t.badge > 0 && (
                <View style={{ backgroundColor: '#fff', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 }}>
                  <Text style={{ color: '#FF4500', fontSize: 10, fontWeight: '800' }}>{t.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 50 }} /> : (
        <>
          {/* ===== ОБЗОР ===== */}
          {tab === 'dashboard' && (
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {totalAttention > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ fontWeight: '800', fontSize: 16, color: '#1a1a1a', marginBottom: 8 }}>Требует внимания</Text>
                  {pendingApps.length > 0 && (
                    <TouchableOpacity onPress={() => { setTab('sellers'); setSellerFilter('pending'); }} style={{ backgroundColor: '#FFF9E6', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#FFD700' }}>
                      <Text style={{ fontSize: 26 }}>🏪</Text>
                      <Text style={{ flex: 1, fontWeight: '700', color: '#1a1a1a' }}>{pendingApps.length} заявок продавцов</Text>
                      <Ionicons name="chevron-forward" size={18} color="#FF4500" />
                    </TouchableOpacity>
                  )}
                  {pendingPromos.length > 0 && (
                    <TouchableOpacity onPress={() => { setTab('promotions'); setPromoFilter('pending'); }} style={{ backgroundColor: '#FFF0EB', borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#FF4500' }}>
                      <Text style={{ fontSize: 26 }}>⚡</Text>
                      <Text style={{ flex: 1, fontWeight: '700', color: '#1a1a1a' }}>{pendingPromos.length} заявок на продвижение</Text>
                      <Ionicons name="chevron-forward" size={18} color="#FF4500" />
                    </TouchableOpacity>
                  )}
                  {pendingSupport.length > 0 && (
                    <TouchableOpacity onPress={() => { setTab('support'); setSupportFilter('pending'); }} style={{ backgroundColor: '#FEE2E2', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#EF4444' }}>
                      <Text style={{ fontSize: 26 }}>🆘</Text>
                      <Text style={{ flex: 1, fontWeight: '700', color: '#1a1a1a' }}>{pendingSupport.length} жалоб без ответа</Text>
                      <Ionicons name="chevron-forward" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#1a1a1a', marginBottom: 8 }}>Платформа в цифрах</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Stat icon="people" color="#FF4500" bg="#FFF0EB" value={buyers.length} label="Покупателей" />
                <Stat icon="storefront" color="#3B82F6" bg="#EFF6FF" value={sellers.length} label="Продавцов" onPress={() => { setTab('sellers'); setSellerFilter('active'); }} />
                <Stat icon="pricetag" color="#22C55E" bg="#F0FFF4" value={deals.filter(d => !d.isHidden).length} label="Активных скидок" onPress={() => setTab('deals')} />
                <Stat icon="cube" color="#F59E0B" bg="#FFFBEB" value={orders.length} label="Всего заказов" onPress={() => setTab('orders')} />
                <Stat icon="hourglass" color="#8B5CF6" bg="#F3E8FF" value={activeOrders.length} label="Активных заказов" />
                <Stat icon="checkmark-done" color="#10B981" bg="#ECFDF5" value={approvedApps.length} label="Одобрено заявок" onPress={() => { setTab('sellers'); setSellerFilter('approved'); }} />
                <Stat icon="close-circle" color="#EF4444" bg="#FEE2E2" value={rejectedApps.length} label="Отклонено заявок" onPress={() => { setTab('sellers'); setSellerFilter('rejected'); }} />
                <Stat icon="eye" color="#0EA5E9" bg="#E0F2FE" value={deals.reduce((t, d) => t + (d.viewCount || 0), 0)} label="Просмотров скидок" />
              </View>
            </ScrollView>
          )}

          {/* ===== ПРОДАВЦЫ ===== */}
          {tab === 'sellers' && (
            <View style={{ flex: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
                <Chip label="Новые" active={sellerFilter === 'pending'} badge={pendingApps.length} onPress={() => setSellerFilter('pending')} />
                <Chip label="Одобренные" active={sellerFilter === 'approved'} badge={0} onPress={() => setSellerFilter('approved')} />
                <Chip label="Отклонённые" active={sellerFilter === 'rejected'} badge={0} onPress={() => setSellerFilter('rejected')} />
                <Chip label={`Активные (${sellers.length})`} active={sellerFilter === 'active'} badge={0} onPress={() => setSellerFilter('active')} />
              </ScrollView>
              <View style={{ marginHorizontal: 12, marginBottom: 6, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="search" size={18} color="#aaa" />
                <TextInput style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#1a1a1a' }} placeholder="Поиск по названию, имени, email…" placeholderTextColor="#bbb" value={search} onChangeText={setSearch} />
              </View>

              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {sellerFilter !== 'active' && (() => {
                  const list = applications
                    .filter(a => a.status === sellerFilter)
                    .filter(a => match(a.storeName, a.fullName, a.email, a.city, a.phone));
                  if (list.length === 0) return <Empty emoji="📭" text="Заявок нет" />;
                  return list.map(a => (
                    <TouchableOpacity key={a.id} onPress={() => setSelectedApp(a)} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 16 }}>{a.storeName}</Text>
                          <Text style={{ color: '#888', fontSize: 13 }}>👤 {a.fullName} · 📍 {a.city}</Text>
                          <Text style={{ color: '#888', fontSize: 12 }}>✉️ {a.email}</Text>
                          <Text style={{ color: '#bbb', fontSize: 11, marginTop: 2 }}>Подана {fmtDate(a.createdAt)}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                      </View>
                      {a.status === 'approved' && (
                        <View style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: isRegistered(a.email) ? '#DCFCE7' : '#FEF3C7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ color: isRegistered(a.email) ? '#16A34A' : '#B45309', fontSize: 12, fontWeight: '700' }}>
                            {isRegistered(a.email) ? '✅ Зарегистрирован' : '⏳ Ещё не зарегистрировался'}
                          </Text>
                        </View>
                      )}
                      {a.status === 'rejected' && a.rejectReason ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 6 }}>Причина: {a.rejectReason}</Text> : null}
                      {a.status === 'pending' && (
                        <View style={{ marginTop: 10, backgroundColor: '#FF4500', borderRadius: 10, paddingVertical: 9, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontWeight: '700' }}>Рассмотреть →</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ));
                })()}

                {sellerFilter === 'active' && (() => {
                  const list = sellers.filter(s => match(s.storeName, s.email, s.city, s.storePhone));
                  if (list.length === 0) return <Empty emoji="🏪" text="Продавцов нет" />;
                  return list.map(s => {
                    const cnt = deals.filter(d => d.sellerId === s.id && !d.isHidden).length;
                    return (
                      <TouchableOpacity key={s.id} onPress={() => setSelectedSeller(s)} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: s.isBlocked ? 0.6 : 1 }}>
                        <View style={{ width: 50, height: 50, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                          {s.storeLogo ? <Image source={{ uri: s.storeLogo }} style={{ width: 50, height: 50 }} /> : <Ionicons name="storefront" size={24} color="#FF4500" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 15 }}>{s.storeName || s.email}</Text>
                          <Text style={{ color: '#888', fontSize: 12 }}>✉️ {s.email}</Text>
                          <Text style={{ color: '#888', fontSize: 12 }}>📍 {s.city} · 🏷 {cnt} скидок</Text>
                        </View>
                        {s.isBlocked && <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 11 }}>🚫</Text>}
                        <Ionicons name="chevron-forward" size={18} color="#ccc" />
                      </TouchableOpacity>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          )}

          {/* ===== ПРОДВИЖЕНИЕ ===== */}
          {tab === 'promotions' && (
            <View style={{ flex: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
                <Chip label="Ожидают" active={promoFilter === 'pending'} badge={pendingPromos.length} onPress={() => setPromoFilter('pending')} />
                <Chip label="Активные / одобрены" active={promoFilter === 'approved'} badge={0} onPress={() => setPromoFilter('approved')} />
                <Chip label="Отклонены" active={promoFilter === 'rejected'} badge={0} onPress={() => setPromoFilter('rejected')} />
              </ScrollView>
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {(() => {
                  const list = promotions.filter(p => p.status === promoFilter);
                  if (list.length === 0) return <Empty emoji="⚡" text="Здесь пусто" />;
                  return list.map(p => {
                    const live = p.status === 'approved' && p.expiresAt && new Date(p.expiresAt) > new Date();
                    return (
                      <View key={p.id} style={{ backgroundColor: '#fff', borderRadius: 18, padding: 14, marginBottom: 12, elevation: 2 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                          <Text style={{ fontWeight: '800', fontSize: 16, color: '#1a1a1a', flex: 1 }}>{p.promoTitle}</Text>
                          {p.status === 'approved' && (
                            <Text style={{ color: live ? '#16A34A' : '#999', fontWeight: '700', fontSize: 12 }}>{live ? '🟢 Идёт' : '⚪ Закончилось'}</Text>
                          )}
                        </View>
                        <Text style={{ color: '#666', fontSize: 13 }}>✉️ {p.sellerEmail}</Text>
                        <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 15, marginTop: 4 }}>{p.planLabel} · {Number(p.price || 0).toLocaleString()} ₸</Text>
                        {p.dealTitle ? <Text style={{ color: '#FF4500', fontSize: 13, marginTop: 4 }}>🎯 {p.dealTitle}</Text> : null}
                        <Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>Заявка: {fmtDate(p.requestedAt)}{p.expiresAt ? ` · до ${fmtDate(p.expiresAt)}` : ''}</Text>
                        {p.status === 'pending' && p.bannerImage ? (
                          <><Text style={{ fontWeight: '700', color: '#6366F1', marginTop: 10, marginBottom: 4 }}>🖼 Баннер:</Text>
                          <Image source={{ uri: p.bannerImage }} style={{ width: '100%', height: 140, borderRadius: 12 }} resizeMode="cover" /></>
                        ) : null}
                        {p.status === 'pending' && p.receiptImage ? (
                          <><Text style={{ fontWeight: '700', color: '#FF9800', marginTop: 10, marginBottom: 4 }}>📸 Чек об оплате:</Text>
                          <Image source={{ uri: p.receiptImage }} style={{ width: '100%', height: 220, borderRadius: 12 }} resizeMode="contain" /></>
                        ) : null}
                        {p.status === 'pending' && (
                          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                            <TouchableOpacity disabled={busy} onPress={() => approvePromotion(p)} style={{ flex: 1, backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                              <Text style={{ color: '#fff', fontWeight: '800' }}>✅ Одобрить</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => rejectPromotion(p)} style={{ flex: 1, borderWidth: 2, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                              <Text style={{ color: '#EF4444', fontWeight: '800' }}>❌ Отклонить</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  });
                })()}
              </ScrollView>
            </View>
          )}

          {/* ===== СКИДКИ ===== */}
          {tab === 'deals' && (
            <View style={{ flex: 1 }}>
              <View style={{ margin: 12, marginBottom: 4, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="search" size={18} color="#aaa" />
                <TextInput style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, color: '#1a1a1a' }} placeholder="Поиск по названию, магазину, городу…" placeholderTextColor="#bbb" value={search} onChangeText={setSearch} />
              </View>
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                <Text style={{ color: '#888', marginBottom: 8 }}>Всего: {deals.length} · скрытых: {deals.filter(d => d.isHidden).length}</Text>
                {deals.filter(d => match(d.title, d.store, d.city, d.category)).map(d => (
                  <View key={d.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 12, marginBottom: 10, elevation: 2, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: d.isHidden ? 0.55 : 1 }}>
                    <View style={{ width: 54, height: 54, borderRadius: 12, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                      {d.imageUrl ? <Image source={{ uri: d.imageUrl }} style={{ width: 54, height: 54 }} resizeMode="cover" /> : <Text style={{ color: '#FF4500', fontWeight: '800' }}>-{d.discount}%</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#1a1a1a' }} numberOfLines={1}>{d.title}</Text>
                      <Text style={{ color: '#999', fontSize: 12 }}>🏪 {d.store} · 📍 {d.city}</Text>
                      <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 13 }}>{Number(d.newPrice).toLocaleString()} ₸ · -{d.discount}% {d.isHidden ? '· скрыта' : ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleDealHidden(d)} style={{ padding: 6 }}>
                      <Ionicons name={d.isHidden ? 'eye' : 'eye-off'} size={20} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteDeal(d)} style={{ padding: 6 }}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
                {deals.length === 0 && <Empty emoji="🏷" text="Скидок нет" />}
              </ScrollView>
            </View>
          )}

          {/* ===== ЗАКАЗЫ ===== */}
          {tab === 'orders' && (
            <ScrollView contentContainerStyle={{ padding: 12 }}>
              <Text style={{ color: '#888', marginBottom: 8 }}>Всего: {orders.length} · активных: {activeOrders.length}</Text>
              {orders.map(o => (
                <View key={o.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '700', color: '#1a1a1a' }} numberOfLines={1}>{o.dealTitle}</Text>
                      <Text style={{ color: '#999', fontSize: 12 }}>👤 {o.buyerEmail}</Text>
                      <Text style={{ color: '#999', fontSize: 12 }}>🏪 {o.storeName}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ color: '#FF4500', fontWeight: '800' }}>{Number(o.price || 0).toLocaleString()} ₸</Text>
                      <Text style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{ORDER_STATUS[o.status] || o.status}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#ccc', fontSize: 11, marginTop: 6 }}>#{o.id?.slice(-6).toUpperCase()} · {fmtDate(o.createdAt)}</Text>
                </View>
              ))}
              {orders.length === 0 && <Empty emoji="📦" text="Заказов нет" />}
            </ScrollView>
          )}

          {/* ===== ЖАЛОБЫ ===== */}
          {tab === 'support' && (
            <View style={{ flex: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 56 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
                <Chip label="Новые" active={supportFilter === 'pending'} badge={pendingSupport.length} onPress={() => setSupportFilter('pending')} />
                <Chip label="Решённые" active={supportFilter === 'resolved'} badge={0} onPress={() => setSupportFilter('resolved')} />
              </ScrollView>
              <ScrollView contentContainerStyle={{ padding: 12 }}>
                {(() => {
                  const list = support.filter(s => (supportFilter === 'resolved') === (s.status === 'resolved'));
                  if (list.length === 0) return <Empty emoji="🆘" text="Жалоб нет" />;
                  return list.map(s => (
                    <View key={s.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, elevation: 2 }}>
                      <Text style={{ fontWeight: '800', color: '#EF4444', fontSize: 15 }}>🆘 {s.topic}</Text>
                      <Text style={{ color: '#666', fontSize: 13, marginTop: 4 }}>👤 {s.userEmail}</Text>
                      {s.dealTitle ? <Text style={{ color: '#FF4500', fontSize: 13 }}>📦 {s.dealTitle}{s.storeName ? ` — ${s.storeName}` : ''}</Text> : null}
                      {s.message ? <View style={{ backgroundColor: '#f8f8f8', borderRadius: 10, padding: 10, marginTop: 8 }}><Text style={{ color: '#333' }}>{s.message}</Text></View> : null}
                      <Text style={{ color: '#bbb', fontSize: 11, marginTop: 6 }}>{fmtDate(s.createdAt)}</Text>
                      {s.status === 'resolved' ? (
                        s.adminReply ? <View style={{ backgroundColor: '#ECFDF5', borderRadius: 10, padding: 10, marginTop: 8 }}><Text style={{ color: '#047857', fontSize: 13 }}>Ответ: {s.adminReply}</Text></View> : null
                      ) : (
                        <View style={{ marginTop: 10 }}>
                          <TextInput
                            style={{ backgroundColor: '#f8f8f8', borderRadius: 12, padding: 10, minHeight: 60, textAlignVertical: 'top', color: '#1a1a1a' }}
                            placeholder="Ответ покупателю (придёт уведомлением)"
                            placeholderTextColor="#bbb" multiline
                            value={replyText[s.id] || ''} onChangeText={v => setReplyText(p => ({ ...p, [s.id]: v }))}
                          />
                          <TouchableOpacity onPress={() => resolveSupport(s)} style={{ backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 8 }}>
                            <Text style={{ color: '#fff', fontWeight: '800' }}>✅ Ответить и закрыть</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ));
                })()}
              </ScrollView>
            </View>
          )}
        </>
      )}
    </View>
  );
}
