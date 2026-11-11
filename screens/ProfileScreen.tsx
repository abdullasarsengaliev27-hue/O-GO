import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, query, where, addDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { AddDealScreen } from './seller/AddDealScreen';
import { SellerStats } from './seller/SellerStats';
import { SellerChats } from './seller/SellerChats';
import { BuyerOrdersScreen, SellerOrdersScreen } from './OrdersScreen';
import { SavingsScreen } from './SavingsScreen';
import { HappyHoursScreen } from './seller/HappyHoursScreen';
import { BuyerRegisterForm } from '../components/BuyerRegisterForm';
import { styles } from '../components/styles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SellerApplicationScreen } from './SellerApplicationScreen';
import { AdminScreen } from './AdminScreen';
import { KaspiSettingsScreen } from './seller/KaspiSettingsScreen';
import { BuyerChatsScreen } from './BuyerChatsScreen';
import { PromotionScreen } from './seller/PromotionScreen';
import { PrivacyPolicyScreen } from './PrivacyPolicyScreen';
import { SocialLinks } from '../components/SocialLinks';
import { DeleteAccountModal } from '../components/DeleteAccountModal';
import { isBadgeActive, fmtDate } from '../utils/verification';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

type ScreenType = 'profile' | 'add' | 'stats' | 'chats' | 'orders' | 'sellerOrders' | 'savings' | 'happyHours' | 'kaspiSettings' | 'buyerChats' | 'promotion';

export function ProfileScreen({ user, userRole, userCity, onCityChange }: {
  user: User | null,
  userRole: string,
  userCity?: string | null,
  onCityChange?: (city: string | null) => void
}) {
  const insets = useSafeAreaInsets();
  const top = insets.top;

  const [mode, setMode] = useState<'choose' | 'login' | 'register' | 'sellerMenu' | 'application' | 'admin'>('choose');
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerCity, setBuyerCity] = useState('');
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [sellerAgreed, setSellerAgreed] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<ScreenType>('profile');
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [sellerDeals, setSellerDeals] = useState<any[]>([]);
  const [buyerFavs, setBuyerFavs] = useState<any[]>([]);
  const [buyerSavings, setBuyerSavings] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');

  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportText, setSupportText] = useState('');
  const [supportTopic, setSupportTopic] = useState('');
  const [supportDeals, setSupportDeals] = useState<any[]>([]);
  const [selectedSupportDeal, setSelectedSupportDeal] = useState<any>(null);

  useEffect(() => {
    if (!user || userRole !== 'seller') return;
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setSellerProfile(snap.data());
    }, () => {});
    const q = query(collection(db, 'deals'), where('sellerId', '==', user.uid));
    const unsubDeals = onSnapshot(q, snap => setSellerDeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))), () => {});
    return () => { unsubProfile(); unsubDeals(); };
  }, [user, userRole]);

  useEffect(() => {
    if (!user || userRole !== 'buyer') return;
    return onSnapshot(collection(db, 'users', user.uid, 'favorites'), snap => {
      const favs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBuyerFavs(favs);
      setBuyerSavings(Math.round(favs.reduce((sum: number, d: any) => sum + ((d.oldPrice || 0) - (d.newPrice || 0)), 0) / 1000));
    }, () => {});
  }, [user, userRole]);

  useEffect(() => {
    if (!user || (userRole !== 'seller' && userRole !== 'buyer')) return;
    const field = userRole === 'seller' ? 'sellerId' : 'buyerId';
    const q = query(collection(db, 'orders'), where(field, '==', user.uid));
    return onSnapshot(q, snap => {
      setActiveOrdersCount(snap.docs.filter(d =>
        d.data().status !== 'delivered' && d.data().status !== 'buyer_confirmed'
      ).length);
    }, () => {});
  }, [user, userRole]);

  useEffect(() => {
    if (!user || userRole !== 'buyer') return;
    return onSnapshot(collection(db, 'deals'), snap => {
      setSupportDeals(
        snap.docs.map(d => ({ id: d.id, ...d.data() })).filter((d: any) => !d.isHidden).slice(0, 50)
      );
    }, () => {});
  }, [user, userRole]);

  const BackBtn = () => (
    <View style={{ backgroundColor: '#fff', paddingTop: top + 8, paddingBottom: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity
        onPress={() => setScreen('profile')}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <Ionicons name="arrow-back" size={24} color="#FF4500" />
        <Text style={{ color: '#FF4500', fontSize: 16, fontWeight: '600' }}>Назад</Text>
      </TouchableOpacity>
    </View>
  );

  if (user && userRole === 'admin') {
    return <AdminScreen onBack={() => signOut(auth)} />;
  }

  const sendSupport = (topic: string) => {
    setSupportTopic(topic);
    setShowSupportModal(true);
  };

  const submitSupport = async () => {
    if (!user) return Alert.alert('Ошибка', 'Сначала войди в аккаунт');
    if (!supportText.trim()) return Alert.alert('Ошибка', 'Напиши текст жалобы');
    try {
      await addDoc(collection(db, 'support'), {
        userId: user.uid,
        userEmail: user.email,
        topic: supportTopic,
        message: supportText,
        dealId: selectedSupportDeal?.id || null,
        dealTitle: selectedSupportDeal?.title || null,
        storeName: selectedSupportDeal?.store || null,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setShowSupportModal(false);
      setSupportText('');
      setSelectedSupportDeal(null);
      Alert.alert('✅ Жалоба отправлена!', 'Администратор рассмотрит ваше обращение в течение 24 часов.');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const changeSellerLogo = async () => {
    if (!user) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к фото');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 1,
    });
    if (result.canceled) return;
    try {
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 200, height: 200 } }],
        { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
      );
      const response = await fetch(resized.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      await updateDoc(doc(db, 'users', user.uid), { storeLogo: base64 });
      Alert.alert('✅ Фото обновлено!');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const policyModal = (
    <Modal visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)}>
      <PrivacyPolicyScreen onClose={() => setShowPolicy(false)} />
    </Modal>
  );

  // Кнопка удаления аккаунта (одинаковая у покупателя и продавца)
  const deleteButton = (
    <TouchableOpacity
      style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, borderWidth: 1, borderColor: '#FECACA' }}
      onPress={() => setShowDelete(true)}
    >
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="trash-outline" size={22} color="#EF4444" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: '700', color: '#EF4444', fontSize: 15 }}>Удалить аккаунт</Text>
        <Text style={{ color: '#999', fontSize: 12 }}>Безвозвратно удалить аккаунт и данные</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#ccc" />
    </TouchableOpacity>
  );

  // ===== ЗАЛОГИНЕН =====
  if (user) {
    if (screen === 'add') return <View style={{ flex: 1 }}><BackBtn /><AddDealScreen user={user} /></View>;
    if (screen === 'stats') return <View style={{ flex: 1 }}><BackBtn /><SellerStats user={user} /></View>;
    if (screen === 'chats') return <View style={{ flex: 1 }}><BackBtn /><SellerChats user={user} /></View>;
    if (screen === 'orders') return <View style={{ flex: 1 }}><BackBtn /><BuyerOrdersScreen user={user} /></View>;
    if (screen === 'sellerOrders') return <View style={{ flex: 1 }}><BackBtn /><SellerOrdersScreen user={user} /></View>;
    if (screen === 'savings') return <View style={{ flex: 1 }}><BackBtn /><SavingsScreen user={user} /></View>;
    if (screen === 'happyHours') return <View style={{ flex: 1 }}><BackBtn /><HappyHoursScreen user={user} /></View>;
    if (screen === 'kaspiSettings') return <View style={{ flex: 1 }}><BackBtn /><KaspiSettingsScreen user={user} /></View>;
    if (screen === 'promotion') return <View style={{ flex: 1 }}><BackBtn /><PromotionScreen user={user} /></View>;
    if (screen === 'buyerChats') return <View style={{ flex: 1 }}><BackBtn /><BuyerChatsScreen user={user} /></View>;

    // ----- Профиль продавца -----
    if (userRole === 'seller') {
      const badgeOn = isBadgeActive(sellerProfile);
      return (
      <>
      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} showsVerticalScrollIndicator={false}>
        <View style={{ backgroundColor: '#FF4500', paddingTop: top + 16, paddingBottom: 40, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity
              onPress={changeSellerLogo}
              style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden', elevation: 4 }}
            >
              {sellerProfile?.storeLogo
                ? <Image source={{ uri: sellerProfile.storeLogo }} style={{ width: 80, height: 80 }} resizeMode="cover" />
                : <Ionicons name="storefront" size={38} color="#FF4500" />
              }
              <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.4)', padding: 4, alignItems: 'center' }}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', flexShrink: 1 }} numberOfLines={2}>
                  {sellerProfile?.storeName || user.email?.split('@')[0]}
                </Text>
                {badgeOn && (
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={22} color="#1D9BF0" />
                  </View>
                )}
              </View>
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>🏪 Продавец</Text>
                </View>
                <View style={{ backgroundColor: '#22C55E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>✓ Активен</Text>
                </View>
              </View>
            </View>
          </View>

          {badgeOn ? (
            <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 14 }}>
              <Ionicons name="checkmark-circle" size={20} color="#1D9BF0" />
              <View>
                <Text style={{ color: '#1D9BF0', fontWeight: '800', fontSize: 13 }}>Подтверждённый бизнес</Text>
                <Text style={{ color: '#888', fontSize: 11 }}>
                  {sellerProfile?.verifiedFree ? 'Навсегда' : `Действует до ${fmtDate(sellerProfile?.verifiedUntil)}`}
                </Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setScreen('promotion')}
              style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {sellerProfile?.verifiedUntil ? 'Значок закончился · продлить' : 'Получить значок подтверждения'}
              </Text>
            </TouchableOpacity>
          )}

          {sellerProfile?.storeAddress && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{sellerProfile.storeAddress}</Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{sellerDeals.filter(d => !d.isHidden).length}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Скидок</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{activeOrdersCount}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Заказов</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>
                {sellerDeals.length > 0 ? Math.round(sellerDeals.reduce((s, d) => s + (d.discount || 0), 0) / sellerDeals.length) : 0}%
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Ср. скидка</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: -20, marginBottom: 16 }}>
          <TouchableOpacity onPress={() => setScreen('add')} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="add-circle" size={24} color="#FF4500" />
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 13 }}>Добавить</Text>
            <Text style={{ color: '#999', fontSize: 11 }}>скидку</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScreen('stats')} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="bar-chart" size={24} color="#3B82F6" />
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 13 }}>Статистика</Text>
            <Text style={{ color: '#999', fontSize: 11 }}>и скидки</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setScreen('sellerOrders')} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="cube" size={24} color="#FF4500" />
              {activeOrdersCount > 0 && (
                <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{activeOrdersCount}</Text>
                </View>
              )}
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 13 }}>Заказы</Text>
            <Text style={{ color: '#999', fontSize: 11 }}>управление</Text>
          </TouchableOpacity>
        </View>

        <View style={{ backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 14, elevation: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#1a1a1a' }}>Активные скидки</Text>
            <TouchableOpacity onPress={() => setScreen('stats')}>
              <Text style={{ color: '#FF4500', fontWeight: '600', fontSize: 13 }}>Все →</Text>
            </TouchableOpacity>
          </View>
          {sellerDeals.filter(d => !d.isHidden).length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <Ionicons name="pricetag-outline" size={36} color="#ddd" />
              <Text style={{ color: '#aaa', marginTop: 8 }}>Нет активных скидок</Text>
            </View>
          ) : sellerDeals.filter(d => !d.isHidden).slice(0, 3).map(deal => (
            <View key={deal.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }}>
              <View style={{ width: 64, height: 64, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' }}>
                {deal.imageUrl
                  ? <Image source={{ uri: deal.imageUrl }} style={{ width: 64, height: 64 }} resizeMode="cover" />
                  : <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 13 }}>-{deal.discount}%</Text>
                }
                {deal.imageUrl && (
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,69,0,0.8)', paddingVertical: 2, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 10 }}>-{deal.discount}%</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 14 }} numberOfLines={1}>{deal.title}</Text>
                <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{Number(deal.newPrice).toLocaleString()} ₸ · {deal.city}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={{ backgroundColor: '#FFF0EB', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4 }} onPress={() => setScreen('add')}>
            <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 14 }}>+ Создать скидочную карточку</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginHorizontal: 16, gap: 10, marginBottom: 24 }}>
          <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2 }} onPress={() => setScreen('happyHours')}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Счастливые часы</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Акции по времени</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2 }} onPress={() => setScreen('chats')}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Мои чаты</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Переписка с покупателями</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2 }} onPress={() => setScreen('promotion')}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 22 }}>🚀</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Продвижение</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Турбо-буст, баннер, карта, значок</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2 }} onPress={() => setScreen('kaspiSettings')}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="card" size={22} color="#FF9800" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Настройки Kaspi</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Реквизиты для оплаты</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2 }} onPress={() => setShowPolicy(true)}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="document-text" size={22} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Политика конфиденциальности</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Обработка персональных данных</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>

          <SocialLinks />

          {deleteButton}

          <TouchableOpacity style={{ backgroundColor: '#FFF0EB', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }} onPress={() => signOut(auth)}>
            <Ionicons name="log-out-outline" size={20} color="#FF4500" />
            <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 15 }}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {policyModal}
      <DeleteAccountModal visible={showDelete} user={user} role="seller" onClose={() => setShowDelete(false)} />
      </>
      );
    }

    // ----- Профиль покупателя -----
    return (
      <>
        <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: '#FF4500', paddingTop: top + 16, paddingBottom: 40, paddingHorizontal: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
                <Text style={{ fontSize: 34 }}>🛍</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 2 }}>{user.email?.split('@')[0]}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 }}>{user.email}</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>🛍 Покупатель</Text>
                </View>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>{buyerFavs.length}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Избранных</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{buyerSavings}K ₸</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Сэкономлено</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 20 }}>
                  {buyerFavs.length > 0 ? Math.round(buyerFavs.reduce((s: number, d: any) => s + (d.discount || 0), 0) / buyerFavs.length) : 0}%
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>Ср. скидка</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: -20, marginBottom: 16 }}>
            <TouchableOpacity onPress={() => setScreen('orders')} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4 }}>
              {activeOrdersCount > 0 && (
                <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#EF4444', borderRadius: 8, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{activeOrdersCount}</Text>
                </View>
              )}
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="cube-outline" size={24} color="#FF4500" />
              </View>
              <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>Мои заказы</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setScreen('savings')} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="wallet-outline" size={24} color="#22C55E" />
              </View>
              <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>Экономия</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setScreen('buyerChats')} style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4 }}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#22C55E" />
              </View>
              <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>Чаты</Text>
            </TouchableOpacity>
          </View>

          <View style={{ marginHorizontal: 16, gap: 10, marginBottom: 24 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="mail" size={18} color="#FF4500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#999', fontSize: 11 }}>Email</Text>
                  <Text style={{ color: '#1a1a1a', fontWeight: '600' }}>{user.email}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' }}
                onPress={async () => { await AsyncStorage.removeItem('selectedCity'); await AsyncStorage.removeItem('userCity'); onCityChange?.(null); }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="location" size={18} color="#FF4500" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#999', fontSize: 11 }}>Мой город</Text>
                  <Text style={{ color: '#1a1a1a', fontWeight: '600' }}>{userCity || 'Не выбран'}</Text>
                </View>
                <Text style={{ color: '#FF4500', fontSize: 13, fontWeight: '600' }}>Изменить →</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <Ionicons name="shield-checkmark" size={18} color="#22C55E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#999', fontSize: 11 }}>Статус</Text>
                  <Text style={{ color: '#1a1a1a', fontWeight: '600' }}>Аккаунт подтверждён</Text>
                </View>
                <Text style={{ color: '#22C55E', fontWeight: '700' }}>✓</Text>
              </View>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2 }}
              onPress={() => {
                Alert.alert('🆘 Поддержка и жалобы', 'Выберите тему обращения:', [
                  { text: '❌ Неработающая скидка', onPress: () => sendSupport('Неработающая скидка') },
                  { text: '💰 Неверная цена', onPress: () => sendSupport('Неверная цена') },
                  { text: '🏪 Закрытый магазин', onPress: () => sendSupport('Закрытый магазин') },
                  { text: '📋 Недостоверная информация', onPress: () => sendSupport('Недостоверная информация') },
                  { text: 'Отмена', style: 'cancel' },
                ]);
              }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFEBEE', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="warning-outline" size={22} color="#EF4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Поддержка и жалобы</Text>
                <Text style={{ color: '#999', fontSize: 12 }}>Пожаловаться на скидку или магазин</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>

            <TouchableOpacity style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2 }} onPress={() => setShowPolicy(true)}>
              <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="document-text" size={22} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Политика конфиденциальности</Text>
                <Text style={{ color: '#999', fontSize: 12 }}>Обработка персональных данных</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>

            <SocialLinks />

            {deleteButton}

            <TouchableOpacity style={{ backgroundColor: '#FFF0EB', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }} onPress={() => signOut(auth)}>
              <Ionicons name="log-out-outline" size={20} color="#FF4500" />
              <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 15 }}>Выйти из аккаунта</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {policyModal}
        <DeleteAccountModal visible={showDelete} user={user} role="buyer" onClose={() => setShowDelete(false)} />

        <Modal visible={showSupportModal} transparent animationType="slide" onRequestClose={() => setShowSupportModal(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%' }}>
              <ScrollView contentContainerStyle={{ padding: 24 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', flex: 1 }}>🆘 {supportTopic}</Text>
                  <TouchableOpacity onPress={() => setShowSupportModal(false)}>
                    <Ionicons name="close" size={24} color="#999" />
                  </TouchableOpacity>
                </View>

                <Text style={{ fontWeight: '700', color: '#333', marginBottom: 10 }}>📦 Выбери скидку (необязательно):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  {supportDeals.slice(0, 20).map(deal => (
                    <TouchableOpacity
                      key={deal.id}
                      onPress={() => setSelectedSupportDeal(selectedSupportDeal?.id === deal.id ? null : deal)}
                      style={{ width: 120, marginRight: 10, borderRadius: 14, overflow: 'hidden', borderWidth: 2, borderColor: selectedSupportDeal?.id === deal.id ? '#FF4500' : 'transparent' }}
                    >
                      {deal.imageUrl
                        ? <Image source={{ uri: deal.imageUrl }} style={{ width: 120, height: 80 }} resizeMode="cover" />
                        : <View style={{ width: 120, height: 80, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
                            <Text style={{ color: '#FF4500', fontWeight: '800' }}>-{deal.discount}%</Text>
                          </View>
                      }
                      <View style={{ padding: 6, backgroundColor: selectedSupportDeal?.id === deal.id ? '#FFF0EB' : '#f8f8f8' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1a1a1a' }} numberOfLines={1}>{deal.title}</Text>
                        <Text style={{ fontSize: 10, color: '#999' }}>{deal.store}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedSupportDeal && (
                  <View style={{ backgroundColor: '#FFF0EB', borderRadius: 12, padding: 10, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="checkmark-circle" size={18} color="#FF4500" />
                    <Text style={{ color: '#FF4500', fontWeight: '700', flex: 1 }} numberOfLines={1}>
                      {selectedSupportDeal.title} — {selectedSupportDeal.store}
                    </Text>
                    <TouchableOpacity onPress={() => setSelectedSupportDeal(null)}>
                      <Ionicons name="close" size={16} color="#FF4500" />
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={{ fontWeight: '700', color: '#333', marginBottom: 8 }}>✍️ Опиши проблему *</Text>
                <TextInput
                  style={{ backgroundColor: '#f8f8f8', borderRadius: 14, padding: 14, fontSize: 15, minHeight: 100, borderWidth: 1.5, borderColor: '#f0f0f0', color: '#1a1a1a', textAlignVertical: 'top' }}
                  placeholder="Опиши подробно что произошло..."
                  value={supportText}
                  onChangeText={setSupportText}
                  multiline
                  placeholderTextColor="#ccc"
                />

                <TouchableOpacity style={{ backgroundColor: '#FF4500', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 16 }} onPress={submitSupport}>
                  <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Отправить жалобу</Text>
                </TouchableOpacity>
                <View style={{ height: 20 }} />
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

  // ===== НЕ ЗАЛОГИНЕН =====
  if (mode === 'application') return <SellerApplicationScreen onBack={() => setMode('choose')} />;

  if (mode === 'sellerMenu') return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView contentContainerStyle={[styles.center, { paddingHorizontal: 24, paddingTop: top + 20, paddingBottom: 24, flexGrow: 1 }]}>
        <TouchableOpacity
          onPress={() => setMode('choose')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ alignSelf: 'flex-start', marginBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="arrow-back" size={22} color="#FF4500" />
          <Text style={{ color: '#FF4500', fontSize: 16, fontWeight: '600' }}>Назад</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 8 }}>🏪 Продавец</Text>
        <Text style={{ color: '#999', textAlign: 'center', marginBottom: 32, fontSize: 15 }}>
          Уже есть аккаунт или хотите подать заявку?
        </Text>
        <TouchableOpacity style={[styles.bigBtn, { marginBottom: 12 }]} onPress={() => { setSelectedRole('seller'); setMode('login'); }}>
          <Text style={styles.bigBtnText}>🔐 Войти в кабинет продавца</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#fff', borderWidth: 2, borderColor: '#FF4500', marginBottom: 12 }]} onPress={() => setMode('application')}>
          <Text style={[styles.bigBtnText, { color: '#FF4500' }]}>📨 Подать заявку на продавца</Text>
        </TouchableOpacity>
        <View style={{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, width: '100%', marginBottom: 24 }}>
          <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>
            ℹ️ Новые продавцы проходят проверку администратором O-GO для защиты покупателей от мошенников.
          </Text>
        </View>
        <TouchableOpacity onLongPress={() => setShowAdminInput(true)} style={{ padding: 10 }}>
          <Text style={{ color: '#ddd', fontSize: 12 }}>O-GO v1.0</Text>
        </TouchableOpacity>
      </ScrollView>

      {showAdminInput && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, paddingBottom: 20 + insets.bottom, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10 }}>
          <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 6 }}>🛡 Панель администратора</Text>
          <Text style={{ color: '#999', fontSize: 13, marginBottom: 16 }}>Войдите через аккаунт администратора</Text>
          <TextInput
            style={styles.input}
            placeholder="Email администратора"
            value={adminEmail}
            onChangeText={setAdminEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={[styles.input, { marginTop: 10 }]}
            placeholder="Пароль"
            value={adminPass}
            onChangeText={setAdminPass}
            secureTextEntry
            placeholderTextColor="#aaa"
          />
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
            <TouchableOpacity
              style={[styles.bigBtn, { flex: 1, backgroundColor: '#f0f0f0' }]}
              onPress={() => { setShowAdminInput(false); setAdminEmail(''); setAdminPass(''); }}
            >
              <Text style={[styles.bigBtnText, { color: '#666' }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bigBtn, { flex: 1 }]}
              onPress={async () => {
                if (!adminEmail || !adminPass) return Alert.alert('Ошибка', 'Заполни все поля');
                setLoading(true);
                try {
                  const res = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPass);
                  const snap = await getDoc(doc(db, 'admins', res.user.uid));
                  if (snap.exists() && snap.data().role === 'admin') {
                    setShowAdminInput(false);
                    setAdminEmail('');
                    setAdminPass('');
                  } else {
                    await signOut(auth);
                    Alert.alert('❌ Нет доступа', 'Этот аккаунт не является администратором');
                  }
                } catch {
                  Alert.alert('❌ Ошибка', 'Неверный email или пароль');
                }
                setLoading(false);
              }}
            >
              <Text style={styles.bigBtnText}>Войти</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  if (mode === 'choose') return (
    <ScrollView style={{ flex: 1, backgroundColor: '#fff' }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: top + 30, paddingBottom: 50, paddingHorizontal: 28, alignItems: 'center' }}>
        <Image
          source={require('../assets/icon.png')}
          style={{ width: 110, height: 110, borderRadius: 28, marginBottom: 16 }}
          resizeMode="cover"
        />
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, textAlign: 'center' }}>Все скидки Казахстана в одном месте</Text>
      </View>

      <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, padding: 28 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 }}>Добро пожаловать! 👋</Text>
        <Text style={{ color: '#999', fontSize: 15, marginBottom: 28 }}>Войдите или создайте аккаунт</Text>

        <Text style={{ fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>🛍 Я покупатель</Text>

        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 15, marginBottom: 12, borderWidth: 1.5, borderColor: '#e5e5e5', gap: 10 }}
          onPress={() => Alert.alert('🔐 Google вход', 'Будет доступен после публикации в App Store.\n\nИспользуйте вход через Email.', [{ text: 'OK' }])}
        >
          <Text style={{ fontSize: 18, fontWeight: '800' }}>G</Text>
          <Text style={{ color: '#333', fontWeight: '700', fontSize: 15 }}>Войти через Google</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ backgroundColor: '#FF4500', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 24, elevation: 4 }}
          onPress={() => { setSelectedRole('buyer'); setMode('login'); }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>📧 Войти через Email</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
          <Text style={{ color: '#ccc', marginHorizontal: 12, fontSize: 13 }}>или</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
        </View>

        <Text style={{ fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>🏪 Я продавец</Text>

        <TouchableOpacity
          style={{ backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 16, elevation: 2 }}
          onPress={() => setMode('sellerMenu')}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>🏪 Войти как продавец</Text>
        </TouchableOpacity>

        <Text style={{ color: '#ccc', fontSize: 12, textAlign: 'center' }}>Google вход только для покупателей</Text>

        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <SocialLinks />
        </View>
      </View>
    </ScrollView>
  );

  // ===== LOGIN / REGISTER =====
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: top + 24, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 4, marginBottom: 6 }}>O-GO</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
          {selectedRole === 'buyer' ? '🛍 Покупатель' : '🏪 Продавец'}
        </Text>
      </View>

      <ScrollView style={{ flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24 }} contentContainerStyle={{ padding: 24 }}>
        <TouchableOpacity
          onPress={() => setMode('choose')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}
        >
          <Ionicons name="arrow-back" size={20} color="#FF4500" />
          <Text style={{ color: '#FF4500', fontSize: 15, fontWeight: '600' }}>Назад</Text>
        </TouchableOpacity>

        <Text style={{ fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 }}>
          {mode === 'register' ? 'Создать аккаунт' : 'Войти в аккаунт'}
        </Text>
        <Text style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
          {mode === 'register' ? 'Заполни данные для регистрации' : 'Введи email и пароль'}
        </Text>

        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 6 }}>Email</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0' }}>
            <Ionicons name="mail-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
            <TextInput style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' }} placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#ccc" />
          </View>
        </View>

        <View style={{ marginBottom: 20 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 6 }}>Пароль</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0' }}>
            <Ionicons name="lock-closed-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
            <TextInput style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' }} placeholder="Минимум 6 символов" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#ccc" />
          </View>
        </View>

        {selectedRole === 'buyer' && mode === 'register' && (
          <BuyerRegisterForm
            buyerName={buyerName} setBuyerName={setBuyerName}
            buyerPhone={buyerPhone} setBuyerPhone={setBuyerPhone}
            buyerCity={buyerCity} setBuyerCity={setBuyerCity}
            agreedToPolicy={agreedToPolicy} setAgreedToPolicy={setAgreedToPolicy}
          />
        )}

        {selectedRole === 'seller' && (
          <>
            <TouchableOpacity
              onPress={() => setSellerAgreed(!sellerAgreed)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: sellerAgreed ? '#F0FFF4' : '#f8f8f8', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: sellerAgreed ? '#22C55E' : '#f0f0f0', marginBottom: 14 }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: sellerAgreed ? '#22C55E' : '#fff', borderWidth: 2, borderColor: sellerAgreed ? '#22C55E' : '#ddd', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                {sellerAgreed && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#1a1a1a', fontSize: 13, lineHeight: 20 }}>
                  Я согласен с{' '}
                  <Text
                    style={{ color: '#FF4500', fontWeight: '700', textDecorationLine: 'underline' }}
                    onPress={() => setShowPolicy(true)}
                  >
                    Политикой конфиденциальности
                  </Text>
                  {' '}и даю согласие на обработку персональных данных
                </Text>
              </View>
            </TouchableOpacity>
            {policyModal}
          </>
        )}

        {loading ? <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 20 }} /> : (
          <>
            <TouchableOpacity
              style={{ backgroundColor: '#FF4500', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12, elevation: 4 }}
              onPress={async () => {
                if (!email || !password) return Alert.alert('Ошибка', 'Заполни все поля');
                setLoading(true);
                try { await signInWithEmailAndPassword(auth, email, password); }
                catch { Alert.alert('Ошибка', 'Неверный email или пароль'); }
                setLoading(false);
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Войти</Text>
            </TouchableOpacity>

            {selectedRole === 'buyer' && (
              <TouchableOpacity
                style={{ backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: '#FF4500', marginBottom: 12 }}
                onPress={async () => {
                  if (!email || !password) return Alert.alert('Ошибка', 'Заполни все поля');
                  if (mode !== 'register') { setMode('register'); return; }
                  if (!buyerName.trim() || !buyerPhone.trim() || !buyerCity) {
                    return Alert.alert('Ошибка', 'Заполни имя, телефон и город');
                  }
                  if (!agreedToPolicy) {
                    return Alert.alert('Ошибка', 'Необходимо принять политику конфиденциальности');
                  }
                  setLoading(true);
                  try {
                    const res = await createUserWithEmailAndPassword(auth, email, password);
                    await setDoc(doc(db, 'users', res.user.uid), {
                      email, role: 'buyer',
                      buyerName, buyerPhone, buyerCity,
                      agreedToPolicy: true,
                      createdAt: new Date().toISOString(),
                    });
                    await sendEmailVerification(res.user);
                    await signOut(auth);
                    setMode('login');
                    Alert.alert('📧 Подтверди email!', `Письмо отправлено на\n${email}\n\nПерейди по ссылке в письме и войди снова.`);
                  } catch (e: any) { Alert.alert('Ошибка', e.message); }
                  setLoading(false);
                }}
              >
                <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 16 }}>Зарегистрироваться</Text>
              </TouchableOpacity>
            )}

            {selectedRole === 'seller' && (
              <TouchableOpacity
                style={{ backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: '#FF4500', marginBottom: 12 }}
                onPress={async () => {
                  if (!email || !password) return Alert.alert('Ошибка', 'Заполни все поля');
                  if (!sellerAgreed) {
                    return Alert.alert('Ошибка', 'Необходимо принять политику конфиденциальности и согласие на обработку персональных данных');
                  }
                  setLoading(true);
                  try {
                    const approvedSnap = await getDoc(doc(db, 'approvedSellers', email.trim()));
                    if (!approvedSnap.exists()) {
                      setLoading(false);
                      return Alert.alert('⛔ Нет доступа', 'Регистрация продавца возможна только после одобрения заявки администратором O-GO.\n\nПодайте заявку через кнопку "Подать заявку на продавца".');
                    }
                    const approvedData = approvedSnap.data();
                    const res = await createUserWithEmailAndPassword(auth, email.trim(), password);
                    await setDoc(doc(db, 'users', res.user.uid), {
                      email: email.trim(), role: 'seller',
                      storeName: approvedData.storeName,
                      storeAddress: approvedData.storeAddress,
                      storeCategory: approvedData.storeCategory,
                      storePhone: approvedData.storePhone,
                      storeDescription: approvedData.storeDescription,
                      storeLogo: approvedData.storeLogo || null,
                      city: approvedData.city,
                      isApproved: true,
                      agreedToPolicy: true,
                      policyAcceptedAt: new Date().toISOString(),
                      createdAt: new Date().toISOString(),
                    });
                    Alert.alert('✅ Добро пожаловать!', 'Ваш кабинет продавца готов!');
                  } catch (e: any) { Alert.alert('Ошибка', e.message); }
                  setLoading(false);
                }}
              >
                <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 16 }}>Зарегистрироваться</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
