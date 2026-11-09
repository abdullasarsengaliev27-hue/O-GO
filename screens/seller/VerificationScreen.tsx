import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, query, where, onSnapshot, doc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from 'firebase/auth';
import { compressToBase64 } from '../../utils/imageToBase64';
import { BADGE_PRICE, SALES_REQUIRED, MAX_PER_BUYER, countValidSales, isBadgeActive, fmtDate } from '../../utils/verification';
import { VerifiedBadge } from '../../components/VerifiedBadge';

const STATUS: Record<string, { t: string; c: string }> = {
  pending: { t: '⏳ На рассмотрении', c: '#FF9800' },
  approved: { t: '✅ Одобрено', c: '#22C55E' },
  rejected: { t: '❌ Отклонено', c: '#EF4444' },
};

export function VerificationScreen({ user }: { user: User }) {
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [showPay, setShowPay] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const byDate = (a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    const u1 = onSnapshot(doc(db, 'users', user.uid), s => setProfile(s.exists() ? s.data() : null));
    const u2 = onSnapshot(query(collection(db, 'orders'), where('sellerId', '==', user.uid)),
      s => setOrders(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const u3 = onSnapshot(query(collection(db, 'badgeApplications'), where('sellerId', '==', user.uid)),
      s => setApps(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate)));
    const u4 = onSnapshot(query(collection(db, 'badgeSubscriptions'), where('sellerId', '==', user.uid)),
      s => setSubs(s.docs.map(d => ({ id: d.id, ...d.data() })).sort(byDate)));
    return () => { u1(); u2(); u3(); u4(); };
  }, [user]);

  const sales = countValidSales(orders, user.uid, user.email || '');
  const active = isBadgeActive(profile);
  const pendingApp = apps.find(a => a.status === 'pending');
  const pendingSub = subs.find(s => s.status === 'pending');
  const canApplyFree = sales.valid >= SALES_REQUIRED && !pendingApp && !profile?.verifiedFree;
  const promoAvailable = !profile?.badgeOnePlusOneUsed;
  const missing = [
    !profile?.storeName && 'название магазина',
    !profile?.storePhone && 'телефон',
    !profile?.storeAddress && 'адрес',
  ].filter(Boolean) as string[];

  const applyFree = async () => {
    setSending(true);
    try {
      await addDoc(collection(db, 'badgeApplications'), {
        sellerId: user.uid, sellerEmail: user.email, storeName: profile?.storeName || '',
        validSales: sales.valid, uniqueBuyers: sales.uniqueBuyers, rawSales: sales.raw,
        status: 'pending', createdAt: new Date().toISOString(),
      });
      Alert.alert('✅ Заявка отправлена', 'Администратор проверит ваш бизнес и продажи.');
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setSending(false);
  };

  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к фото');
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (r.canceled) return;
    setPhotoBusy(true);
    try { setReceipt(await compressToBase64(r.assets[0].uri, { maxWidth: 1280, maxBytes: 420 * 1024 })); }
    catch (e: any) { Alert.alert('Ошибка', e.message); }
    setPhotoBusy(false);
  };

  const openPay = () => {
    if (pendingSub) return Alert.alert('Уже есть заявка', 'Дождитесь решения по предыдущей оплате.');
    if (missing.length) return Alert.alert('Заполните данные бизнеса', `В профиле не хватает: ${missing.join(', ')}.`);
    setReceipt(null);
    setShowPay(true);
  };

  const submitPay = async () => {
    if (!receipt) return Alert.alert('Прикрепи чек', 'Загрузи скриншот чека об оплате Kaspi');
    setSending(true);
    try {
      await addDoc(collection(db, 'badgeSubscriptions'), {
        sellerId: user.uid, sellerEmail: user.email, storeName: profile?.storeName || '',
        amount: BADGE_PRICE, receiptImage: receipt,
        requestedOnePlusOne: promoAvailable,
        status: 'pending', createdAt: new Date().toISOString(),
      });
      setShowPay(false);
      Alert.alert('✅ Заявка отправлена', 'Админ проверит чек и данные бизнеса, затем активирует значок.');
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setSending(false);
  };

  if (!profile) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator size="large" color="#FF4500" /></View>;

  const pct = Math.min(100, Math.round((sales.valid / SALES_REQUIRED) * 100));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ padding: 16 }}>
      {/* Статус */}
      <View style={{ backgroundColor: active ? '#EAF5FE' : '#fff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: active ? 1.5 : 0, borderColor: '#1D9BF0' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="checkmark-circle" size={40} color={active ? '#1D9BF0' : '#ccc'} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1a1a1a' }}>Подтверждённый бизнес</Text>
            <Text style={{ color: active ? '#1D9BF0' : '#999', fontWeight: '600', marginTop: 2 }}>
              {profile.verifiedFree ? 'Активен навсегда (бесплатное подтверждение)'
                : active ? `Активен до ${fmtDate(profile.verifiedUntil)}`
                : profile.verifiedUntil ? `Закончился ${fmtDate(profile.verifiedUntil)}` : 'Не подключён'}
            </Text>
          </View>
        </View>
        <Text style={{ color: '#666', fontSize: 13, marginTop: 10, lineHeight: 19 }}>
          Синий значок рядом с названием магазина повышает доверие покупателей.
        </Text>
      </View>

      {/* Путь 1: бесплатно */}
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14 }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: '#1a1a1a' }}>🆓 Бесплатно — за {SALES_REQUIRED} продаж</Text>
        <Text style={{ color: '#666', fontSize: 13, marginTop: 6, lineHeight: 19 }}>
          Считаются заказы, подтверждённые покупателем. Не больше {MAX_PER_BUYER} заказов от одного покупателя, заказы себе не считаются.
        </Text>
        <View style={{ height: 10, backgroundColor: '#eee', borderRadius: 5, marginTop: 12, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: 10, backgroundColor: '#1D9BF0' }} />
        </View>
        <Text style={{ color: '#1a1a1a', fontWeight: '700', marginTop: 6 }}>
          {sales.valid} из {SALES_REQUIRED} · покупателей: {sales.uniqueBuyers}
        </Text>

        {profile.verifiedFree ? (
          <Text style={{ color: '#22C55E', fontWeight: '700', marginTop: 10 }}>✅ Бесплатное подтверждение получено</Text>
        ) : pendingApp ? (
          <Text style={{ color: '#FF9800', fontWeight: '700', marginTop: 10 }}>⏳ Заявка на рассмотрении</Text>
        ) : (
          <TouchableOpacity
            disabled={!canApplyFree || sending}
            onPress={applyFree}
            style={{ backgroundColor: canApplyFree ? '#1D9BF0' : '#ddd', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}
          >
            {sending ? <ActivityIndicator color="#fff" /> : (
              <Text style={{ color: canApplyFree ? '#fff' : '#999', fontWeight: '800' }}>
                {canApplyFree ? 'Подать заявку на подтверждение' : `Нужно ещё ${SALES_REQUIRED - sales.valid} продаж`}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Путь 2: платно */}
      <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14 }}>
        <Text style={{ fontWeight: '800', fontSize: 16, color: '#1a1a1a' }}>⚡ Подписка — {BADGE_PRICE.toLocaleString()} ₸ / месяц</Text>
        <Text style={{ color: '#666', fontSize: 13, marginTop: 6, lineHeight: 19 }}>
          Можно оформить в любое время. Значок включается после проверки чека и данных вашего бизнеса администратором.
        </Text>

        {promoAvailable && (
          <View style={{ backgroundColor: '#FFF0EB', borderRadius: 14, padding: 12, marginTop: 12, borderWidth: 1, borderColor: '#FF4500' }}>
            <Text style={{ color: '#FF4500', fontWeight: '800' }}>�� Акция 1+1</Text>
            <Text style={{ color: '#666', fontSize: 13, marginTop: 2 }}>
              Первая оплата {BADGE_PRICE.toLocaleString()} ₸ даёт 2 месяца: второй в подарок. Один раз для бизнеса.
            </Text>
          </View>
        )}

        {pendingSub ? (
          <Text style={{ color: '#FF9800', fontWeight: '700', marginTop: 12 }}>⏳ Оплата на проверке</Text>
        ) : (
          <TouchableOpacity onPress={openPay} style={{ backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '800' }}>{active && profile.verifiedUntil ? 'Продлить на месяц' : 'Оформить подписку'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* История */}
      <Text style={{ fontWeight: '800', fontSize: 16, color: '#1a1a1a', marginBottom: 8 }}>История</Text>
      {apps.length + subs.length === 0 ? <Text style={{ color: '#aaa' }}>Пока пусто</Text> : (
        <>
          {apps.map(a => (
            <View key={a.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8 }}>
              <Text style={{ fontWeight: '700' }}>Заявка по продажам · {fmtDate(a.createdAt)}</Text>
              <Text style={{ color: STATUS[a.status]?.c }}>{STATUS[a.status]?.t}</Text>
              {a.status === 'rejected' && a.rejectReason ? <Text style={{ color: '#EF4444', fontSize: 12 }}>Причина: {a.rejectReason}</Text> : null}
            </View>
          ))}
          {subs.map(s => (
            <View key={s.id} style={{ backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8 }}>
              <Text style={{ fontWeight: '700' }}>Подписка {Number(s.amount).toLocaleString()} ₸ · {fmtDate(s.createdAt)}</Text>
              <Text style={{ color: STATUS[s.status]?.c }}>{STATUS[s.status]?.t}</Text>
              {s.status === 'approved' && <Text style={{ color: '#666', fontSize: 12 }}>{s.monthsGranted} мес.{s.usedOnePlusOne ? ' (акция 1+1)' : ''} · до {fmtDate(s.expiresAt)}</Text>}
              {s.status === 'rejected' && s.rejectReason ? <Text style={{ color: '#EF4444', fontSize: 12 }}>Причина: {s.rejectReason}</Text> : null}
            </View>
          ))}
        </>
      )}

      {/* Окно оплаты */}
      <Modal visible={showPay} transparent animationType="slide" onRequestClose={() => setShowPay(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <ScrollView style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' }}>
            <View style={{ padding: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <VerifiedBadge size={24} />
                  <Text style={{ fontSize: 19, fontWeight: '800' }}>Значок подтверждения</Text>
                </View>
                <TouchableOpacity onPress={() => setShowPay(false)}><Ionicons name="close" size={24} color="#999" /></TouchableOpacity>
              </View>
              <View style={{ backgroundColor: '#FFF9E6', borderRadius: 14, padding: 14, marginBottom: 14 }}>
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>📱 Оплата через Kaspi</Text>
                <Text style={{ color: '#555', fontSize: 13, lineHeight: 20 }}>
                  1. Переведи <Text style={{ fontWeight: '800', color: '#FF4500' }}>{BADGE_PRICE.toLocaleString()} ₸</Text>{'\n'}
                  2. Номер: <Text style={{ fontWeight: '800' }}>+7 700 000 0000</Text>{'\n'}
                  3. Получатель: <Text style={{ fontWeight: '800' }}>O-GO Платформа</Text>
                </Text>
              </View>
              {promoAvailable && <Text style={{ color: '#FF4500', fontWeight: '700', marginBottom: 12 }}>🎁 Акция 1+1: получите 2 месяца за эту оплату</Text>}
              <Text style={{ fontWeight: '700', marginBottom: 8 }}>📸 Скриншот чека *</Text>
              {receipt ? (
                <View style={{ marginBottom: 14 }}>
                  <Image source={{ uri: receipt }} style={{ width: '100%', height: 180, borderRadius: 14 }} resizeMode="contain" />
                  <TouchableOpacity onPress={() => setReceipt(null)} style={{ alignItems: 'center', marginTop: 6 }}><Text style={{ color: '#f44336' }}>✕ Удалить</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={pickReceipt} disabled={photoBusy} style={{ height: 100, borderRadius: 14, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', marginBottom: 14 }}>
                  {photoBusy ? <ActivityIndicator color="#FF4500" /> : <><Ionicons name="cloud-upload" size={30} color="#FF4500" /><Text style={{ color: '#FF4500', fontWeight: '600', marginTop: 6 }}>Загрузить чек</Text></>}
                </TouchableOpacity>
              )}
              <TouchableOpacity disabled={sending} onPress={submitPay} style={{ backgroundColor: '#FF4500', borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}>
                {sending ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Отправить заявку</Text>}
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
