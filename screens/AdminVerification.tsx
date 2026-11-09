import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, doc, getDoc, writeBatch, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { countValidSales, isBadgeActive, addMonths, fmtDate, SALES_REQUIRED } from '../utils/verification';

type Tab = 'apps' | 'subs' | 'sellers';
const ST: Record<string, string> = { pending: 'Ожидают', approved: 'Одобрены', rejected: 'Отклонены' };

export function AdminVerification({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('apps');
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [apps, setApps] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const byDate = (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    const u = [
      onSnapshot(collection(db, 'badgeApplications'), s => setApps(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate))),
      onSnapshot(collection(db, 'badgeSubscriptions'), s => setSubs(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate))),
      onSnapshot(collection(db, 'users'), s => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(collection(db, 'orders'), s => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() })))),
    ];
    return () => u.forEach(f => f());
  }, []);

  const sellers = users.filter(x => x.role === 'seller');
  const salesOf = (sellerId: string) => {
    const s = users.find(x => x.id === sellerId);
    return countValidSales(orders, sellerId, s?.email);
  };
  const pendApps = apps.filter(a => a.status === 'pending').length;
  const pendSubs = subs.filter(a => a.status === 'pending').length;

  // ===== Бесплатная заявка =====
  const approveApp = async (a: any) => {
    if (!checked[a.id]) return Alert.alert('Подтвердите проверку', 'Отметьте «Бизнес проверен».');
    const { valid } = salesOf(a.sellerId); // пересчёт по заказам, не по данным заявки
    if (valid < SALES_REQUIRED) return Alert.alert('Недостаточно продаж', `Реально засчитано ${valid} из ${SALES_REQUIRED}.`);
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const b = writeBatch(db);
      b.update(doc(db, 'badgeApplications', a.id), { status: 'approved', decidedAt: now, validSalesAtDecision: valid });
      b.set(doc(db, 'users', a.sellerId), { verifiedFree: true, verifiedFreeAt: now, businessChecked: true }, { merge: true });
      await b.commit();
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setBusy(false);
  };

  const rejectApp = async (a: any) => {
    if (!(reason[a.id] || '').trim()) return Alert.alert('Укажите причину');
    await updateDoc(doc(db, 'badgeApplications', a.id), { status: 'rejected', rejectReason: reason[a.id].trim(), decidedAt: new Date().toISOString() });
  };

  // ===== Платная подписка =====
  const approveSub = async (s: any) => {
    if (!checked[s.id]) return Alert.alert('Подтвердите проверку', 'Платный значок не выдаётся без проверки бизнеса. Отметьте «Бизнес проверен».');
    setBusy(true);
    try {
      const snap = await getDoc(doc(db, 'users', s.sellerId)); // свежий документ
      const u: any = snap.exists() ? snap.data() : {};
      const onePlusOne = !u.badgeOnePlusOneUsed;
      const months = onePlusOne ? 2 : 1;
      const base = u.verifiedUntil && new Date(u.verifiedUntil) > new Date() ? new Date(u.verifiedUntil) : new Date();
      const start = base.toISOString();
      const expiresAt = addMonths(base, months).toISOString();
      const now = new Date().toISOString();
      const b = writeBatch(db);
      b.update(doc(db, 'badgeSubscriptions', s.id), {
        status: 'approved', decidedAt: now, monthsGranted: months, usedOnePlusOne: onePlusOne, startsAt: start, expiresAt,
      });
      b.set(doc(db, 'users', s.sellerId), {
        verifiedUntil: expiresAt, businessChecked: true, badgeLastSubscriptionId: s.id,
        ...(onePlusOne ? { badgeOnePlusOneUsed: true } : {}),
      }, { merge: true });
      await b.commit();
      Alert.alert('✅ Значок активирован', `${months} мес., до ${fmtDate(expiresAt)}${onePlusOne ? '\nПрименена акция 1+1' : ''}`);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setBusy(false);
  };

  const rejectSub = async (s: any) => {
    if (!(reason[s.id] || '').trim()) return Alert.alert('Укажите причину');
    await updateDoc(doc(db, 'badgeSubscriptions', s.id), { status: 'rejected', rejectReason: reason[s.id].trim(), decidedAt: new Date().toISOString() });
  };

  const revoke = (u: any) =>
    Alert.alert('Отозвать значок?', u.storeName || u.email, [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Отозвать', style: 'destructive', onPress: () =>
        updateDoc(doc(db, 'users', u.id), { verifiedFree: false, verifiedUntil: null, businessChecked: false }) },
    ]);

  const Chip = ({ label, active, onPress, badge = 0 }: any) => (
    <TouchableOpacity onPress={onPress} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: active ? '#1D9BF0' : '#fff', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      <Text style={{ color: active ? '#fff' : '#555', fontWeight: '700', fontSize: 13 }}>{label}</Text>
      {badge > 0 && <View style={{ backgroundColor: '#FF4500', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{badge}</Text></View>}
    </TouchableOpacity>
  );

  const CheckRow = ({ id }: { id: string }) => (
    <TouchableOpacity onPress={() => setChecked(p => ({ ...p, [id]: !p[id] }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
      <Ionicons name={checked[id] ? 'checkbox' : 'square-outline'} size={24} color={checked[id] ? '#22C55E' : '#999'} />
      <Text style={{ color: '#333', fontWeight: '600', flex: 1 }}>Бизнес проверен (магазин, телефон, адрес реальны)</Text>
    </TouchableOpacity>
  );

  const Decision = ({ id, onApprove, onReject }: any) => (
    <>
      <CheckRow id={id} />
      <TextInput
        style={{ backgroundColor: '#f8f8f8', borderRadius: 10, padding: 10, marginTop: 10, color: '#1a1a1a' }}
        placeholder="Причина отказа (если отклоняете)" placeholderTextColor="#bbb"
        value={reason[id] || ''} onChangeText={v => setReason(p => ({ ...p, [id]: v }))}
      />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <TouchableOpacity disabled={busy} onPress={onApprove} style={{ flex: 1, backgroundColor: '#22C55E', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '800' }}>✅ Одобрить</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onReject} style={{ flex: 1, borderWidth: 2, borderColor: '#EF4444', borderRadius: 12, paddingVertical: 11, alignItems: 'center' }}>
          <Text style={{ color: '#EF4444', fontWeight: '800' }}>❌ Отклонить</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#1a1a1a', paddingTop: insets.top + 10, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}><Ionicons name="arrow-back" size={26} color="#fff" /></TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>✔ Значки подтверждения</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Заявки (50 продаж)" active={tab === 'apps'} badge={pendApps} onPress={() => setTab('apps')} />
          <Chip label="Оплаты" active={tab === 'subs'} badge={pendSubs} onPress={() => setTab('subs')} />
          <Chip label="Продавцы" active={tab === 'sellers'} onPress={() => setTab('sellers')} />
        </ScrollView>
      </View>

      {tab !== 'sellers' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 54 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}>
          {(['pending', 'approved', 'rejected'] as const).map(f => <Chip key={f} label={ST[f]} active={filter === f} onPress={() => setFilter(f)} />)}
        </ScrollView>
      )}

      <ScrollView contentContainerStyle={{ padding: 12 }}>
        {tab === 'apps' && (apps.filter(a => a.status === filter).length === 0
          ? <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>Заявок нет</Text>
          : apps.filter(a => a.status === filter).map(a => {
              const s = users.find(x => x.id === a.sellerId) || {};
              const real = salesOf(a.sellerId);
              return (
                <View key={a.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <Text style={{ fontWeight: '800', fontSize: 16 }}>{a.storeName || s.storeName}</Text>
                  <Text style={{ color: '#666' }}>✉️ {a.sellerEmail} · 📍 {s.city || '—'}</Text>
                  <Text style={{ color: '#666' }}>📞 {s.storePhone || '—'} · 🏠 {s.storeAddress || '—'}</Text>
                  <View style={{ backgroundColor: '#EAF5FE', borderRadius: 10, padding: 10, marginTop: 8 }}>
                    <Text style={{ color: '#1D6FA5', fontWeight: '700' }}>Засчитано продаж сейчас: {real.valid} (в заявке: {a.validSales})</Text>
                    <Text style={{ color: '#1D6FA5', fontSize: 12 }}>Покупателей: {real.uniqueBuyers} · всего подтверждённых заказов: {real.raw}</Text>
                  </View>
                  <Text style={{ color: '#aaa', fontSize: 12, marginTop: 6 }}>Подана {fmtDate(a.createdAt)}</Text>
                  {a.status === 'pending' ? <Decision id={a.id} onApprove={() => approveApp(a)} onReject={() => rejectApp(a)} />
                    : a.status === 'rejected' && a.rejectReason ? <Text style={{ color: '#EF4444', marginTop: 6 }}>Причина: {a.rejectReason}</Text> : null}
                </View>
              );
            }))}

        {tab === 'subs' && (subs.filter(a => a.status === filter).length === 0
          ? <Text style={{ color: '#aaa', textAlign: 'center', marginTop: 40 }}>Оплат нет</Text>
          : subs.filter(a => a.status === filter).map(s => {
              const u = users.find(x => x.id === s.sellerId) || {};
              return (
                <View key={s.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12 }}>
                  <Text style={{ fontWeight: '800', fontSize: 16 }}>{s.storeName || u.storeName}</Text>
                  <Text style={{ color: '#666' }}>✉️ {s.sellerEmail} · {Number(s.amount).toLocaleString()} ₸</Text>
                  <Text style={{ color: '#666' }}>📞 {u.storePhone || '—'} · 🏠 {u.storeAddress || '—'}</Text>
                  <Text style={{ color: u.badgeOnePlusOneUsed ? '#999' : '#FF4500', fontWeight: '700', marginTop: 4 }}>
                    {u.badgeOnePlusOneUsed ? 'Акция 1+1 уже использована' : '🎁 Акция 1+1 доступна: будет 2 месяца'}
                  </Text>
                  <Text style={{ color: '#aaa', fontSize: 12 }}>Заявка {fmtDate(s.createdAt)}</Text>
                  {s.status === 'pending' && s.receiptImage ? <Image source={{ uri: s.receiptImage }} style={{ width: '100%', height: 220, borderRadius: 12, marginTop: 8 }} resizeMode="contain" /> : null}
                  {s.status === 'approved' && <Text style={{ color: '#16A34A', marginTop: 6 }}>{s.monthsGranted} мес.{s.usedOnePlusOne ? ' (1+1)' : ''}: {fmtDate(s.startsAt)} → {fmtDate(s.expiresAt)}</Text>}
                  {s.status === 'rejected' && s.rejectReason ? <Text style={{ color: '#EF4444', marginTop: 6 }}>Причина: {s.rejectReason}</Text> : null}
                  {s.status === 'pending' && <Decision id={s.id} onApprove={() => approveSub(s)} onReject={() => rejectSub(s)} />}
                </View>
              );
            }))}

        {tab === 'sellers' && sellers.map(u => {
          const r = salesOf(u.id);
          const on = isBadgeActive(u);
          return (
            <View key={u.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontWeight: '800', fontSize: 15, flex: 1 }}>{u.storeName || u.email}</Text>
                {on && <Ionicons name="checkmark-circle" size={20} color="#1D9BF0" />}
              </View>
              <Text style={{ color: '#666', fontSize: 13 }}>✉️ {u.email}</Text>
              <Text style={{ color: '#666', fontSize: 13 }}>Продаж: {r.valid} · покупателей: {r.uniqueBuyers}</Text>
              <Text style={{ color: on ? '#1D9BF0' : '#999', fontWeight: '600', fontSize: 13 }}>
                {u.verifiedFree ? 'Значок: бесплатный, навсегда' : on ? `Значок: платный до ${fmtDate(u.verifiedUntil)}` : u.verifiedUntil ? `Значок истёк ${fmtDate(u.verifiedUntil)}` : 'Значка нет'}
              </Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Акция 1+1: {u.badgeOnePlusOneUsed ? 'использована' : 'не использована'}</Text>
              {(u.verifiedFree || u.verifiedUntil) && (
                <TouchableOpacity onPress={() => revoke(u)} style={{ marginTop: 8 }}><Text style={{ color: '#EF4444', fontWeight: '700' }}>Отозвать значок</Text></TouchableOpacity>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
