import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
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

type ScreenType = 'profile' | 'add' | 'stats' | 'chats' | 'orders' | 'sellerOrders' | 'savings' | 'happyHours' | 'kaspiSettings' | 'buyerChats' | 'promotion';

export function ProfileScreen({ user, userRole, userCity, onCityChange }: {
  user: User | null,
  userRole: string,
  userCity?: string | null,
  onCityChange?: (city: string | null) => void
}) {
  const [mode, setMode] = useState<'choose' | 'login' | 'register' | 'sellerMenu' | 'application' | 'admin'>('choose');
  const [selectedRole, setSelectedRole] = useState<'buyer' | 'seller'>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerCity, setBuyerCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState<ScreenType>('profile');
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [sellerDeals, setSellerDeals] = useState<any[]>([]);
  const [buyerFavs, setBuyerFavs] = useState<any[]>([]);
  const [buyerSavings, setBuyerSavings] = useState(0);
  const [activeOrdersCount, setActiveOrdersCount] = useState(0);
  const [newNotifications, setNewNotifications] = useState(0);
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    if (!user || userRole !== 'seller') return;
    const unsubProfile = onSnapshot(doc(db, 'users', user.uid), snap => {
      if (snap.exists()) setSellerProfile(snap.data());
    });
    const q = query(collection(db, 'deals'), where('sellerId', '==', user.uid));
    const unsubDeals = onSnapshot(q, snap => setSellerDeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubProfile(); unsubDeals(); };
  }, [user, userRole]);

  useEffect(() => {
    if (!user || userRole !== 'buyer') return;
    return onSnapshot(collection(db, 'users', user.uid, 'favorites'), snap => {
      const favs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBuyerFavs(favs);
      setBuyerSavings(Math.round(favs.reduce((sum: number, d: any) => sum + ((d.oldPrice || 0) - (d.newPrice || 0)), 0) / 1000));
    });
  }, [user, userRole]);

  useEffect(() => {
    if (!user) return;
    const field = userRole === 'seller' ? 'sellerId' : 'buyerId';
    const q = query(collection(db, 'orders'), where(field, '==', user.uid));
return onSnapshot(q, snap => {
  setActiveOrdersCount(snap.docs.filter(d => 
    d.data().status !== 'delivered' && 
    d.data().status !== 'buyer_confirmed'
  ).length);
});
  }, [user, userRole]);

  useEffect(() => {
    if (!user || userRole !== 'seller') return;
    const q = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
    return onSnapshot(q, snap => {
      setNewNotifications(snap.docs.filter(d => d.data().read === false).length);
    });
  }, [user, userRole]);

  const BackBtn = () => (
    <TouchableOpacity onPress={() => setScreen('profile')} style={{ padding: 16 }}>
      <Text style={{ color: '#FF4500', fontSize: 16 }}>← Назад</Text>
    </TouchableOpacity>
  );

  // Залогинен
  if (user) {
    if (screen === 'add') return <View style={{ flex: 1 }}><BackBtn /><AddDealScreen user={user} sellerCategory={sellerProfile?.storeCategory} /></View>;
    if (screen === 'stats') return <View style={{ flex: 1 }}><BackBtn /><SellerStats user={user} /></View>;
    if (screen === 'chats') return <View style={{ flex: 1 }}><BackBtn /><SellerChats user={user} /></View>;
    if (screen === 'orders') return <View style={{ flex: 1 }}><BackBtn /><BuyerOrdersScreen user={user} /></View>;
    if (screen === 'sellerOrders') return <View style={{ flex: 1 }}><BackBtn /><SellerOrdersScreen user={user} /></View>;
    if (screen === 'savings') return <View style={{ flex: 1 }}><BackBtn /><SavingsScreen user={user} /></View>;
    if (screen === 'happyHours') return <View style={{ flex: 1 }}><BackBtn /><HappyHoursScreen user={user} /></View>;
    if (screen === 'kaspiSettings') return <View style={{ flex: 1 }}><BackBtn /><KaspiSettingsScreen user={user} /></View>;
    if (screen === 'promotion') return <View style={{ flex: 1 }}><BackBtn /><PromotionScreen user={user} /></View>;
    if (screen === 'buyerChats') return <View style={{ flex: 1 }}><BackBtn /><BuyerChatsScreen user={user} /></View>;

    // Профиль продавца
    if (userRole === 'seller') return (
      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} showsVerticalScrollIndicator={false}>
        {/* Шапка продавца */}
        <View style={{ backgroundColor: '#FF4500', paddingTop: 24, paddingBottom: 40, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            {/* Логотип */}
            <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginRight: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }}>
              {sellerProfile?.storeLogo
                ? <Image source={{ uri: sellerProfile.storeLogo }} style={{ width: 80, height: 80 }} resizeMode="cover" />
                : <Ionicons name="storefront" size={38} color="#FF4500" />
              }
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 4 }}>
                {sellerProfile?.storeName || user.email?.split('@')[0]}
              </Text>
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
    
          {sellerProfile?.storeAddress && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <Ionicons name="location" size={14} color="rgba(255,255,255,0.8)" />
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{sellerProfile.storeAddress}</Text>
            </View>
          )}
    
          {/* Статистика продавца */}
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
    
        {/* Быстрые действия */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: -20, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setScreen('add')}
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.12, shadowRadius: 10 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="add-circle" size={24} color="#FF4500" />
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 13 }}>Добавить</Text>
            <Text style={{ color: '#999', fontSize: 11 }}>скидку</Text>
          </TouchableOpacity>
    
          <TouchableOpacity
            onPress={() => setScreen('stats')}
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.12, shadowRadius: 10 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="bar-chart" size={24} color="#3B82F6" />
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 13 }}>Статистика</Text>
            <Text style={{ color: '#999', fontSize: 11 }}>и скидки</Text>
          </TouchableOpacity>
    
          <TouchableOpacity
            onPress={() => setScreen('sellerOrders')}
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.12, shadowRadius: 10 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 6, position: 'relative' }}>
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
    
        {/* Активные скидки */}
        <View style={{ backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
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
              <View style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 13 }}>-{deal.discount}%</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 14 }} numberOfLines={1}>{deal.title}</Text>
                <Text style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{Number(deal.newPrice).toLocaleString()} ₸ · {deal.city}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={{ backgroundColor: '#FFF0EB', borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginTop: 4 }}
            onPress={() => setScreen('add')}
          >
            <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 14 }}>+ Создать скидочную карточку</Text>
          </TouchableOpacity>
        </View>
    
        {/* Меню действий */}
        <View style={{ marginHorizontal: 16, gap: 10, marginBottom: 24 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
            onPress={() => setScreen('happyHours')}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 22 }}>⚡</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Счастливые часы</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Акции по времени</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
    
          <TouchableOpacity
            style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
            onPress={() => setScreen('chats')}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="chatbubble-ellipses" size={22} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Мои чаты</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Переписка с покупателями</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
    
          <TouchableOpacity
  style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, marginBottom: 10 }}
  onPress={() => setScreen('promotion')}
>
  <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontSize: 22 }}>⚡</Text>
  </View>
  <View style={{ flex: 1 }}>
    <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Продвижение</Text>
    <Text style={{ color: '#999', fontSize: 12 }}>Турбо-буст, баннер, карта</Text>
  </View>
  <Ionicons name="chevron-forward" size={18} color="#ccc" />
</TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6 }}
            onPress={() => setScreen('kaspiSettings' as any)}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF9E6', justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="card" size={22} color="#FF9800" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>Настройки Kaspi</Text>
              <Text style={{ color: '#999', fontSize: 12 }}>Реквизиты для оплаты</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ccc" />
          </TouchableOpacity>
    
          <TouchableOpacity
            style={{ backgroundColor: '#FFF0EB', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onPress={() => signOut(auth)}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4500" />
            <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 15 }}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );

    // Профиль покупателя
    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} showsVerticalScrollIndicator={false}>
        {/* Шапка покупателя */}
        <View style={{ backgroundColor: '#FF4500', paddingTop: 24, paddingBottom: 40, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)' }}>
              <Text style={{ fontSize: 34 }}>🛍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 2 }}>
                {user.email?.split('@')[0]}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 6 }}>{user.email}</Text>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600' }}>🛍 Покупатель</Text>
              </View>
            </View>
          </View>
    
          {/* Статистика */}
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
    
        {/* Быстрые действия */}
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginTop: -20, marginBottom: 16 }}>
          <TouchableOpacity
            onPress={() => setScreen('orders')}
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.12, shadowRadius: 10, position: 'relative' }}
          >
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
    
          <TouchableOpacity
            onPress={() => setScreen('savings')}
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.12, shadowRadius: 10 }}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#F0FFF4', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="wallet-outline" size={24} color="#22C55E" />
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>Экономия</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 16, alignItems: 'center', elevation: 4, shadowColor: '#FF4500', shadowOpacity: 0.12, shadowRadius: 10 }}
            onPress={() => setScreen('buyerChats')}
          >
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 6 }}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#22C55E" />
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>Чаты</Text>
          </TouchableOpacity>
        </View>
    

        {/* Настройки */}
        <View style={{ marginHorizontal: 16, gap: 10, marginBottom: 24 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 }}>
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
              onPress={async () => { await AsyncStorage.removeItem('userCity'); onCityChange?.(null); }}
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
            style={{ backgroundColor: '#FFF0EB', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            onPress={() => signOut(auth)}
          >
            <Ionicons name="log-out-outline" size={20} color="#FF4500" />
            <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 15 }}>Выйти из аккаунта</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Не залогинен — экраны
  if (mode === 'application') return <SellerApplicationScreen onBack={() => setMode('choose')} />;
  if (mode === 'admin') return <AdminScreen onBack={() => setMode('choose')} />;

  if (mode === 'sellerMenu') return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <ScrollView contentContainerStyle={[styles.center, { padding: 24, flexGrow: 1 }]}>
        <TouchableOpacity onPress={() => setMode('choose')} style={{ alignSelf: 'flex-start', marginBottom: 24 }}>
          <Text style={{ color: '#FF4500', fontSize: 16 }}>← Назад</Text>
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
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, elevation: 10 }}>
          <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 12 }}>🛡 Вход для администратора</Text>
          <TextInput style={styles.input} placeholder="Введи пароль администратора" value={adminPassword} onChangeText={setAdminPassword} secureTextEntry placeholderTextColor="#aaa" autoFocus />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.bigBtn, { flex: 1, backgroundColor: '#f0f0f0' }]} onPress={() => { setShowAdminInput(false); setAdminPassword(''); }}>
              <Text style={[styles.bigBtnText, { color: '#666' }]}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.bigBtn, { flex: 1 }]} onPress={() => {
              if (adminPassword === 'ogoadmin2024') { setShowAdminInput(false); setAdminPassword(''); setMode('admin'); }
              else Alert.alert('❌ Неверный пароль');
            }}>
              <Text style={styles.bigBtnText}>Войти</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  if (mode === 'choose') return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Верхняя часть с градиентом */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: 80, paddingBottom: 50, paddingHorizontal: 28, alignItems: 'center' }}>
        <View style={{ width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 16, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
          <Text style={{ fontSize: 40, fontWeight: '900', color: '#fff' }}>O</Text>
        </View>
        <Text style={{ fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 6, marginBottom: 8 }}>O-GO</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, textAlign: 'center' }}>Все скидки Казахстана в одном месте</Text>
      </View>
  
      {/* Нижняя часть */}
      <View style={{ flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24, padding: 28 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 }}>Добро пожаловать! 👋</Text>
        <Text style={{ color: '#999', fontSize: 15, marginBottom: 28 }}>Войдите или создайте аккаунт</Text>
  
        {/* Покупатель */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>🛍 Я покупатель</Text>
  
        <TouchableOpacity
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 15, marginBottom: 12, borderWidth: 1.5, borderColor: '#e5e5e5', elevation: 1, gap: 10 }}
          onPress={() => Alert.alert('🔐 Google вход', 'Будет доступен после публикации в App Store.\n\nИспользуйте вход через Email.', [{ text: 'OK' }])}
        >
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '800' }}>G</Text>
          </View>
          <Text style={{ color: '#333', fontWeight: '700', fontSize: 15 }}>Войти через Google</Text>
        </TouchableOpacity>
  
        <TouchableOpacity
          style={{ backgroundColor: '#FF4500', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 24, shadowColor: '#FF4500', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}
          onPress={() => { setSelectedRole('buyer'); setMode('login'); }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>📧 Войти через Email</Text>
        </TouchableOpacity>
  
        {/* Разделитель */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
          <Text style={{ color: '#ccc', marginHorizontal: 12, fontSize: 13 }}>или</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#f0f0f0' }} />
        </View>
  
        {/* Продавец */}
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#999', marginBottom: 12, letterSpacing: 0.5, textTransform: 'uppercase' }}>🏪 Я продавец</Text>
  
        <TouchableOpacity
          style={{ backgroundColor: '#1a1a1a', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginBottom: 16, elevation: 2 }}
          onPress={() => setMode('sellerMenu')}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>🏪 Войти как продавец</Text>
        </TouchableOpacity>
  
        <Text style={{ color: '#ccc', fontSize: 12, textAlign: 'center' }}>Google вход только для покупателей</Text>
      </View>
    </View>
  );

  // Login / Register форма
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: 60, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 32, fontWeight: '900', color: '#fff', letterSpacing: 4, marginBottom: 6 }}>O-GO</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
          {selectedRole === 'buyer' ? '🛍 Покупатель' : '🏪 Продавец'}
        </Text>
      </View>
  
      <ScrollView style={{ flex: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, marginTop: -24 }} contentContainerStyle={{ padding: 24 }}>
        <TouchableOpacity onPress={() => setMode('choose')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 24 }}>
          <Ionicons name="arrow-back" size={20} color="#FF4500" />
          <Text style={{ color: '#FF4500', fontSize: 15, fontWeight: '600' }}>Назад</Text>
        </TouchableOpacity>
  
        <Text style={{ fontSize: 24, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 }}>
          {mode === 'register' ? 'Создать аккаунт' : 'Войти в аккаунт'}
        </Text>
        <Text style={{ color: '#999', fontSize: 14, marginBottom: 24 }}>
          {mode === 'register' ? 'Заполни данные для регистрации' : 'Введи email и пароль'}
        </Text>
  
        {/* Email */}
        <View style={{ marginBottom: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#444', marginBottom: 6 }}>Email</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0' }}>
            <Ionicons name="mail-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
            <TextInput style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' }} placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#ccc" />
          </View>
        </View>
  
        {/* Пароль */}
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
          />
        )}
  
        {loading ? <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 20 }} /> : (
          <>
            {/* Кнопка ВОЙТИ */}
            <TouchableOpacity
              style={{ backgroundColor: '#FF4500', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12, shadowColor: '#FF4500', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 }}
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
            
            {/* Кнопка ЗАРЕГИСТРИРОВАТЬСЯ — покупатель */}
            {selectedRole === 'buyer' && (
              <TouchableOpacity
                style={{ backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: '#FF4500', marginBottom: 12 }}
                onPress={async () => {
                  if (!email || !password) return Alert.alert('Ошибка', 'Заполни все поля');
                  setMode('register');
                  if (mode !== 'register') return;
                  setLoading(true);
                  try {
                    const res = await createUserWithEmailAndPassword(auth, email, password);
                    await sendEmailVerification(res.user);await signOut(auth);
Alert.alert(
  '📧 Подтверди email!',
  `Письмо отправлено на\n${email}\n\nПерейди по ссылке в письме и войди снова.`,
  [{ text: 'OK' }]
);
                    await setDoc(doc(db, 'users', res.user.uid), {
                      email, role: 'buyer',
                      buyerName, buyerPhone, buyerCity,
                      createdAt: new Date().toISOString(),
                    });
                    Alert.alert('✅ Успешно', 'Аккаунт создан!');
                  } catch (e: any) { Alert.alert('Ошибка', e.message); }
                  setLoading(false);
                }}
              >
                <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 16 }}>Зарегистрироваться</Text>
              </TouchableOpacity>
            )}
  
            {/* Кнопка ЗАРЕГИСТРИРОВАТЬСЯ — продавец с проверкой */}
            {selectedRole === 'seller' && (
              <TouchableOpacity
                style={{ backgroundColor: '#fff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 2, borderColor: '#FF4500', marginBottom: 12 }}
                onPress={async () => {
                  if (!email || !password) return Alert.alert('Ошибка', 'Заполни все поля');
                  setLoading(true);
                  try {
                    const approvedSnap = await getDoc(doc(db, 'approvedSellers', email));
                    if (!approvedSnap.exists()) {
                      setLoading(false);
                      return Alert.alert('⛔ Нет доступа', 'Регистрация продавца возможна только после одобрения заявки администратором O-GO.\n\nПодайте заявку через кнопку "Подать заявку на продавца".');
                    }
                    const approvedData = approvedSnap.data();
                    const res = await createUserWithEmailAndPassword(auth, email, password);
                    await setDoc(doc(db, 'users', res.user.uid), {
                      email, role: 'seller',
                      storeName: approvedData.storeName,
                      storeAddress: approvedData.storeAddress,
                      storeCategory: approvedData.storeCategory,
                      storePhone: approvedData.storePhone,
                      storeDescription: approvedData.storeDescription,
                      storeLogo: approvedData.storeLogo || null,
                      city: approvedData.city,
                      isApproved: true,
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