import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';

const PROMOTIONS = [
  {
    id: 'turbo',
    icon: '🚀',
    title: 'Турбо-буст',
    subtitle: 'Закрепление в топе ленты',
    description: 'Выбранная скидка поднимается на самый верх ленты и закрепляется там на 24 часа.',
    color: '#FF4500',
    bgColor: '#FFF0EB',
    needsDealSelection: true,
    plans: [{ id: 'turbo_24h', label: '24 часа', price: 990, hours: 24 }]
  },
  {
    id: 'banner',
    icon: '📢',
    title: 'Распродажа дня',
    subtitle: 'Баннер на главном экране',
    description: 'Большой красивый баннер вашего магазина появляется на самом верху главного экрана.',
    color: '#6366F1',
    bgColor: '#EEF2FF',
    needsDealSelection: false,
    plans: [
      { id: 'banner_3d', label: '3 дня', price: 2990, hours: 72 },
      { id: 'banner_7d', label: '7 дней', price: 4990, hours: 168 },
    ]
  },
  {
    id: 'map',
    icon: '📍',
    title: 'Выделение на карте',
    subtitle: 'Яркий маркер на карте',
    description: 'Ваш маркер на карте становится золотым и увеличенным.',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
    needsDealSelection: false,
    plans: [{ id: 'map_7d', label: '7 дней', price: 1490, hours: 168 }]
  },
];

export function PromotionScreen({ user }: { user: User }) {  const [activePromotions, setActivePromotions] = useState<any[]>([]);
  const [myDeals, setMyDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPromo, setSelectedPromo] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDealPicker, setShowDealPicker] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'promotions'), where('sellerId', '==', user.uid));
    return onSnapshot(q, snap => {
      const now = new Date();
      const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((p: any) => p.status === 'approved' && p.expiresAt && new Date(p.expiresAt) > now);
      setActivePromotions(active);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    const q = query(collection(db, 'deals'), where('sellerId', '==', user.uid));
    return onSnapshot(q, snap => {
      setMyDeals(snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((d: any) => !d.isHidden));
    });
  }, [user]);

  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к фото');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.8,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      setReceiptImage(base64);
    }
  };

  const isActive = (promoId: string) => activePromotions.some((p: any) => p.type === promoId);
  const getExpiry = (promoId: string) => {
    const promo = activePromotions.find((p: any) => p.type === promoId);
    if (!promo) return null;
    return new Date(promo.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const openModal = (promo: any) => {
    setSelectedPromo(promo);
    setSelectedPlan(promo.plans[0]);
    setSelectedDeal(null);
    setReceiptImage(null);
    setShowModal(true);
  };

  const handlePay = async () => {
    if (!selectedPlan || !selectedPromo) return;
    if (selectedPromo.needsDealSelection && !selectedDeal) {
      return Alert.alert('Выбери публикацию', 'Выбери скидку для Турбо-буста');
    }
    if (!receiptImage) {
      return Alert.alert('Прикрепи чек', 'Загрузи скриншот чека об оплате Kaspi');
    }
    setPaying(true);
    try {
      await addDoc(collection(db, 'promotions'), {
        sellerId: user.uid,
        sellerEmail: user.email,
        type: selectedPromo.id,
        promoTitle: selectedPromo.title,
        planId: selectedPlan.id,
        price: selectedPlan.price,
        planLabel: selectedPlan.label,
        dealId: selectedDeal?.id || null,
        dealTitle: selectedDeal?.title || null,
        receiptImage,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        expiresAt: null,
      });
      setShowModal(false);
      Alert.alert('✅ Заявка отправлена!', 'Администратор проверит чек и активирует продвижение в течение 15 минут.');
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
    setPaying(false);
  };

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#FF4500" />
    </View>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} showsVerticalScrollIndicator={false}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: 20, paddingBottom: 40, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 }}>⚡ Продвижение</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Привлекайте больше покупателей</Text>
      </View>

      <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
        {activePromotions.length > 0 && (
          <View style={{ backgroundColor: '#E8F5E9', borderRadius: 20, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontWeight: '800', color: '#166534', fontSize: 15, marginBottom: 10 }}>✅ Активные продвижения</Text>
            {activePromotions.map((p: any) => {
              const promo = PROMOTIONS.find(pr => pr.id === p.type);
              return (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Text style={{ fontSize: 20 }}>{promo?.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#166534', fontSize: 14 }}>{promo?.title}</Text>
                    {p.dealTitle && <Text style={{ color: '#22C55E', fontSize: 12 }}>📦 {p.dealTitle}</Text>}
                    <Text style={{ color: '#22C55E', fontSize: 12 }}>До {new Date(p.expiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {PROMOTIONS.map(promo => {
          const active = isActive(promo.id);
          const expiry = getExpiry(promo.id);
          return (
            <View key={promo.id} style={{ backgroundColor: '#fff', borderRadius: 20, marginBottom: 14, overflow: 'hidden', elevation: 3 }}>
              <View style={{ height: 4, backgroundColor: promo.color }} />
              <View style={{ padding: 18 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: promo.bgColor, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 26 }}>{promo.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 17 }}>{promo.title}</Text>
                    <Text style={{ color: promo.color, fontSize: 13, fontWeight: '600' }}>{promo.subtitle}</Text>
                  </View>
                  {active && (
                    <View style={{ backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
                      <Text style={{ color: '#22C55E', fontSize: 11, fontWeight: '700' }}>✅ Активно</Text>
                    </View>
                  )}
                </View>

                <Text style={{ color: '#666', fontSize: 14, lineHeight: 20, marginBottom: 14 }}>{promo.description}</Text>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                  {promo.plans.map(plan => (
                    <View key={plan.id} style={{ flex: 1, backgroundColor: promo.bgColor, borderRadius: 14, padding: 12, alignItems: 'center' }}>
                      <Text style={{ color: promo.color, fontWeight: '900', fontSize: 18 }}>{plan.price.toLocaleString()} ₸</Text>
                      <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>{plan.label}</Text>
                    </View>
                  ))}
                </View>

                {active && expiry ? (
                  <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#22C55E', fontWeight: '700' }}>✅ Активно до {expiry}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => openModal(promo)}
                    style={{ backgroundColor: promo.color, borderRadius: 14, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                  >
                    <Ionicons name="flash" size={18} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Запустить продвижение</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ backgroundColor: '#FFF9E6', borderRadius: 16, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#FFD700' }}>
          <Text style={{ fontWeight: '700', color: '#333', marginBottom: 4 }}>�� Как работает</Text>
          <Text style={{ color: '#666', fontSize: 13, lineHeight: 18 }}>
            1. Выберите услугу и публикацию{'\n'}
            2. Переведите оплату на Kaspi{'\n'}
            3. Загрузите скриншот чека{'\n'}
            4. Администратор проверит и активирует
          </Text>
        </View>
      </View>

      {/* Модал оплаты */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <ScrollView style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%' }}>
            <View style={{ padding: 24 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a' }}>
                  {selectedPromo?.icon} {selectedPromo?.title}
                </Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Ionicons name="close" size={24} color="#999" />
                </TouchableOpacity>
              </View>

              {/* Выбор плана */}
              {selectedPromo?.plans.length > 1 && (
                <>
                  <Text style={{ fontWeight: '700', color: '#333', marginBottom: 10 }}>Выбери период:</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    {selectedPromo?.plans.map((plan: any) => (
                      <TouchableOpacity
                        key={plan.id}
                        onPress={() => setSelectedPlan(plan)}
                        style={{ flex: 1, borderRadius: 14, padding: 14, alignItems: 'center', backgroundColor: selectedPlan?.id === plan.id ? selectedPromo.color : '#f5f5f5', borderWidth: 2, borderColor: selectedPlan?.id === plan.id ? selectedPromo.color : 'transparent' }}
                      >
                        <Text style={{ color: selectedPlan?.id === plan.id ? '#fff' : '#1a1a1a', fontWeight: '900', fontSize: 18 }}>{plan.price.toLocaleString()} ₸</Text>
                        <Text style={{ color: selectedPlan?.id === plan.id ? 'rgba(255,255,255,0.8)' : '#999', fontSize: 13 }}>{plan.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* Выбор публикации для Турбо-буста */}
              {selectedPromo?.needsDealSelection && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ fontWeight: '700', color: '#333', marginBottom: 10 }}>🎯 Выбери публикацию для Турбо-буста:</Text>
                  {myDeals.length === 0 ? (
                    <View style={{ backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                      <Text style={{ color: '#aaa' }}>Нет активных публикаций</Text>
                    </View>
                  ) : myDeals.map(deal => (
                    <TouchableOpacity
                      key={deal.id}
                      onPress={() => setSelectedDeal(deal)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        padding: 12, borderRadius: 14, marginBottom: 8,
                        backgroundColor: selectedDeal?.id === deal.id ? '#FFF0EB' : '#f8f8f8',
                        borderWidth: 2, borderColor: selectedDeal?.id === deal.id ? '#FF4500' : 'transparent'
                      }}
                    >
                      {deal.imageUrl && (
                        <Image source={{ uri: deal.imageUrl }} style={{ width: 52, height: 52, borderRadius: 10 }} resizeMode="cover" />
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 14 }} numberOfLines={1}>{deal.title}</Text>
                        <Text style={{ color: '#FF4500', fontWeight: '700' }}>{Number(deal.newPrice).toLocaleString()} ₸ · -{deal.discount}%</Text>
                      </View>
                      {selectedDeal?.id === deal.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#FF4500" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Инструкция оплаты */}
              <View style={{ backgroundColor: '#FFF9E6', borderRadius: 14, padding: 14, marginBottom: 16 }}>
                <Text style={{ fontWeight: '700', color: '#333', marginBottom: 6 }}>📱 Оплата через Kaspi:</Text>
                <Text style={{ color: '#555', fontSize: 13, lineHeight: 20 }}>
                  1. Переведи <Text style={{ fontWeight: '800', color: '#FF4500' }}>{selectedPlan?.price.toLocaleString()} ₸</Text>{'\n'}
                  2. Номер: <Text style={{ fontWeight: '800' }}>+7 700 000 0000</Text>{'\n'}
                  3. Получатель: <Text style={{ fontWeight: '800' }}>O-GO Платформа</Text>
                </Text>
              </View>

              {/* Загрузка чека */}
              <Text style={{ fontWeight: '700', color: '#333', marginBottom: 10 }}>📸 Скриншот чека об оплате *</Text>
              {receiptImage ? (
                <View style={{ marginBottom: 16 }}>
                  <Image source={{ uri: receiptImage }} style={{ width: '100%', height: 180, borderRadius: 14 }} resizeMode="contain" />
                  <TouchableOpacity onPress={() => setReceiptImage(null)} style={{ marginTop: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#f44336', fontSize: 13 }}>✕ Удалить и загрузить другой</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickReceipt}
                  style={{ height: 100, borderRadius: 14, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', marginBottom: 16 }}
                >
                  <Ionicons name="cloud-upload" size={30} color="#FF4500" />
                  <Text style={{ color: '#FF4500', fontWeight: '600', marginTop: 6 }}>Загрузить чек</Text>
                  <Text style={{ color: '#aaa', fontSize: 12 }}>Обязательно!</Text>
                </TouchableOpacity>
              )}

              {paying
                ? <ActivityIndicator size="large" color="#FF4500" />
                : <TouchableOpacity
                    style={{ backgroundColor: '#FF4500', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    onPress={handlePay}
                  >
                    <Ionicons name="flash" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Отправить заявку</Text>
                  </TouchableOpacity>
              }
              <View style={{ height: 20 }} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Модал выбора публикации */}
      <Modal visible={showDealPicker} transparent animationType="slide" onRequestClose={() => setShowDealPicker(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '70%' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 16 }}>Выбери публикацию</Text>
            <ScrollView>
              {myDeals.map(deal => (
                <TouchableOpacity
                  key={deal.id}
                  onPress={() => { setSelectedDeal(deal); setShowDealPicker(false); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, marginBottom: 8, backgroundColor: '#f8f8f8' }}
                >
                  {deal.imageUrl && <Image source={{ uri: deal.imageUrl }} style={{ width: 52, height: 52, borderRadius: 10 }} resizeMode="cover" />}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700', color: '#1a1a1a' }} numberOfLines={1}>{deal.title}</Text>
                    <Text style={{ color: '#FF4500', fontWeight: '700' }}>{Number(deal.newPrice).toLocaleString()} ₸ · -{deal.discount}%</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
