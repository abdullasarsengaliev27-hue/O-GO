import { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, setDoc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { StarRating } from './StarRating';
import { ReviewModal } from './ReviewModal';
import { OrderModal } from './OrderModal';
import { BookingModal } from './BookingModal';
import { ChatScreen } from '../screens/ChatScreen';




export function DealCard({ item, user, onStorePress }: {
  item: any,
  user: User | null,
  onStorePress?: (sellerId: string) => void
}) {
  const [isFav, setIsFav] = useState(false);
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [showReviews, setShowReviews] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showFullMenu, setShowFullMenu] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid, 'favorites', item.id)).then(snap => setIsFav(snap.exists()));
  }, [user, item.id]);

  useEffect(() => {
    return onSnapshot(collection(db, 'deals', item.id, 'reviews'), snap => {
      const revs = snap.docs.map(d => d.data());
      setReviewCount(revs.length);
      if (revs.length > 0) setAvgRating(revs.reduce((sum: number, r: any) => sum + r.rating, 0) / revs.length);
    });
  }, [item.id]);

  const toggleFav = async () => {
    if (!user) return Alert.alert('Войдите', 'Чтобы добавить в избранное');
    const ref = doc(db, 'users', user.uid, 'favorites', item.id);
    if (isFav) { await deleteDoc(ref); setIsFav(false); }
    else { await setDoc(ref, { ...item, savedAt: new Date().toISOString() }); setIsFav(true); }
  };

  const savingsAmount = item.marketPrice
    ? Number(item.marketPrice) - Number(item.newPrice)
    : Number(item.oldPrice) - Number(item.newPrice);

  return (
    <>
      <ReviewModal deal={item} user={user} visible={showReviews} onClose={() => setShowReviews(false)} />
      <OrderModal deal={item} user={user} visible={showOrder} onClose={() => setShowOrder(false)} />
      {item.hasBooking && <BookingModal deal={item} user={user} visible={showBooking} onClose={() => setShowBooking(false)} />}

      <View style={{
        backgroundColor: '#fff',
        borderRadius: 20,
        marginBottom: 16,
        marginHorizontal: 2,
        shadowColor: '#FF4500',
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
        overflow: 'hidden',
      }}>
        {/* Фото */}
        <TouchableOpacity onPress={() => item.imageUrl && setShowFullImage(true)} activeOpacity={0.95}>
  {item.imageUrl
    ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
    : <View style={{ width: '100%', height: 200, backgroundColor: '#f8f8f8', justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="image-outline" size={48} color="#ddd" />
      </View>
  }
  {item.imageUrl && (
    <View style={{ position: 'absolute', bottom: 48, right: 12, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 5 }}>
      <Ionicons name="expand" size={16} color="#fff" />
    </View>
  )}
</TouchableOpacity>

          {/* Градиент снизу */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'transparent' }}>
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, backgroundColor: 'rgba(0,0,0,0.35)' }} />
          </View>

          {/* Бейдж скидки */}
          <View style={{
            position: 'absolute', top: 12, left: 12,
            backgroundColor: '#FF4500',
            borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
            flexDirection: 'row', alignItems: 'center', gap: 4,
          }}>
            <Ionicons name="flash" size={13} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>-{item.discount}%</Text>
          </View>

          {/* Кнопка избранного */}
          <TouchableOpacity
            onPress={toggleFav}
            style={{
              position: 'absolute', top: 12, right: 12,
              width: 38, height: 38, borderRadius: 19,
              backgroundColor: 'rgba(255,255,255,0.95)',
              justifyContent: 'center', alignItems: 'center',
              shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2,
            }}
          >
            <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? '#FF4500' : '#999'} />
          </TouchableOpacity>

          {/* Цены поверх фото */}
          <View style={{ position: 'absolute', bottom: 10, left: 12, right: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 22 }}>
                {Number(item.newPrice).toLocaleString()} ₸
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, textDecorationLine: 'line-through' }}>
                {Number(item.oldPrice).toLocaleString()} ₸
              </Text>
            </View>
            {savingsAmount > 0 && (
              <View style={{ backgroundColor: '#4CAF50', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  -{savingsAmount.toLocaleString()} ₸
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Контент */}
        <View style={{ padding: 14 }}>
          {/* Категория */}
          <Text style={{ color: '#FF4500', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' }}>
            {item.category}
          </Text>

          {/* Название */}
          <Text style={{ fontSize: 17, fontWeight: '700', color: '#1a1a1a', marginBottom: 8, lineHeight: 22 }} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Рейтинг + магазин */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <TouchableOpacity onPress={() => setShowReviews(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="star" size={14} color="#FFB800" />
              <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 13 }}>
                {avgRating > 0 ? avgRating.toFixed(1) : '—'}
              </Text>
              <Text style={{ color: '#999', fontSize: 12 }}>({reviewCount})</Text>
            </TouchableOpacity>

            {/* Магазин */}
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
              onPress={() => item.sellerId && onStorePress?.(item.sellerId)}
            >
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="storefront" size={13} color="#FF4500" />
              </View>
              <Text style={{ color: '#FF4500', fontSize: 12, fontWeight: '600' }}>{item.store}</Text>
            </TouchableOpacity>
          </View>

          {/* Адрес */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            <Ionicons name="location-outline" size={13} color="#999" />
            <Text style={{ color: '#999', fontSize: 12 }}>{item.city}</Text>
            {item.exactAddress && (
              <Text style={{ color: '#bbb', fontSize: 11 }} numberOfLines={1}> · {item.exactAddress.split(',').slice(0, 2).join(',')}</Text>
            )}
          </View>

          {/* Теги еды */}
          {item.foodTags && item.foodTags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {item.foodTags.map((tag: string) => (
                <View key={tag} style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#FFD700' }}>
                  <Text style={{ fontSize: 11, color: '#333' }}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Блок сравнения цен */}
          {item.marketPrice && Number(item.marketPrice) > Number(item.newPrice) && (
  <View style={{ backgroundColor: '#F0FFF4', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1.5, borderColor: '#86EFAC' }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <Ionicons name="trending-down" size={16} color="#22C55E" />
      <Text style={{ fontWeight: '800', color: '#166534', fontSize: 14 }}>📊 Сравнение с рынком</Text>
    </View>

    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
      {/* В O-GO */}
      <View style={{ flex: 1, backgroundColor: '#FF4500', borderRadius: 14, padding: 12, alignItems: 'center', overflow: 'hidden' }}>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>✅ В O-GO</Text>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={{ width: 64, height: 64, borderRadius: 10, marginBottom: 8 }} resizeMode="cover" />
        )}
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 17 }}>
          {Number(item.newPrice).toLocaleString()} ₸
        </Text>
      </View>

      {/* VS */}
      <View style={{ justifyContent: 'center', alignItems: 'center', width: 32 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 20, width: 32, height: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#22C55E' }}>VS</Text>
        </View>
      </View>

      {/* Без O-GO */}
      <View style={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1.5, borderColor: '#e5e5e5' }}>
        <Text style={{ color: '#999', fontSize: 11, fontWeight: '600', marginBottom: 6 }}>❌ Без O-GO</Text>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={{ width: 64, height: 64, borderRadius: 10, marginBottom: 8, opacity: 0.4 }} resizeMode="cover" />
        )}
        <Text style={{ color: '#aaa', fontWeight: '800', fontSize: 17, textDecorationLine: 'line-through' }}>
          {Number(item.marketPrice).toLocaleString()} ₸
        </Text>
      </View>
    </View>

    {/* Выгода */}
    <View style={{ backgroundColor: '#22C55E', borderRadius: 12, padding: 12, alignItems: 'center' }}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
        💰 Твоя выгода: {(Number(item.marketPrice) - Number(item.newPrice)).toLocaleString()} ₸
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>
        То же качество — только для тебя дешевле!
      </Text>
    </View>
  </View>
)}

          {/* Меню еды */}
          {item.menuItems && item.menuItems.length > 0 && (
            <View style={{ backgroundColor: '#fafafa', borderRadius: 12, padding: 10, marginBottom: 10 }}>
              <Text style={{ fontWeight: '700', color: '#1a1a1a', marginBottom: 6, fontSize: 13 }}>📋 Меню</Text>
              {item.menuItems.slice(0, showFullMenu ? 100 : 3).map((m: any, i: number) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                  <Text style={{ color: '#555', fontSize: 13, flex: 1 }}>{m.name}</Text>
                  <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 13 }}>{Number(m.price).toLocaleString()} ₸</Text>
                </View>
              ))}
              {item.menuItems.length > 3 && (
                <TouchableOpacity onPress={() => setShowFullMenu(!showFullMenu)} style={{ marginTop: 4 }}>
                  <Text style={{ color: '#FF4500', fontSize: 12, fontWeight: '600' }}>
                    {showFullMenu ? 'Свернуть ▲' : `Ещё ${item.menuItems.length - 3} позиций ▼`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Разделитель */}
          <View style={{ height: 1, backgroundColor: '#f0f0f0', marginBottom: 12 }} />

          {/* Кнопки действий */}
          <View style={{ gap: 8 }}>
            {/* Бронирование */}
            {item.hasBooking && (
              <TouchableOpacity
                onPress={() => setShowBooking(true)}
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F0FFF4', borderRadius: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: '#22C55E' }}
              >
                <Ionicons name="calendar" size={18} color="#22C55E" />
                <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: 15 }}>Забронировать столик</Text>
              </TouchableOpacity>
            )}

            {/* Заказать */}
            {user && user.uid !== item.sellerId && item.hasDelivery && (
              <TouchableOpacity
                onPress={() => setShowOrder(true)}
                style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14,
                  shadowColor: '#FF4500', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
                }}
              >
                <Ionicons name="cart" size={18} color="#fff" />
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Заказать со скидкой</Text>
              </TouchableOpacity>
            )}

            {/* Написать продавцу */}
            {user && user.uid !== item.sellerId && (
  <TouchableOpacity
    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FFF0EB', borderRadius: 14, paddingVertical: 12 }}
    onPress={() => {
      const chatId = [user.uid, item.sellerId].sort().join('_') + '_' + item.id;
      setActiveChatId(chatId);
    }}
  >
    <Ionicons name="chatbubble-ellipses" size={16} color="#FF4500" />
    <Text style={{ color: '#FF4500', fontWeight: '600', fontSize: 14 }}>Написать продавцу</Text>
  </TouchableOpacity>
)}

{activeChatId && user && (
  <Modal visible={!!activeChatId} animationType="slide" onRequestClose={() => setActiveChatId(null)}>
    <ChatScreen
      user={user}
      chatId={activeChatId}
      otherUserId={item.sellerId}
      otherUserName={item.store}
      dealTitle={item.title}
      buyerId={user.uid}
      sellerId={item.sellerId}
      onBack={() => setActiveChatId(null)}
    />
  </Modal>
)}
          </View>
        </View>
      {/* Полноэкранный просмотр фото */}
      {showFullImage && (
  <Modal visible={showFullImage} transparent animationType="fade" onRequestClose={() => setShowFullImage(false)}>
    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
      {/* Кнопка закрыть */}
      <TouchableOpacity
        onPress={() => setShowFullImage(false)}
        style={{ position: 'absolute', top: 54, right: 16, zIndex: 100, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Название товара */}
      <View style={{ position: 'absolute', top: 60, left: 16, right: 70, zIndex: 100 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{item.title}</Text>
      </View>

      {/* Фото */}
      <Image
        source={{ uri: item.imageUrl }}
        style={{ width: '100%', height: '70%' }}
        resizeMode="contain"
      />

      {/* Подсказка */}
      <View style={{ position: 'absolute', bottom: 50, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ color: '#fff', fontSize: 13 }}>Нажми ✕ или за пределами фото чтобы закрыть</Text>
      </View>
    </View>
  </Modal>
)}
    </>
  );
}