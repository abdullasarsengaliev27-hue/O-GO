import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { styles } from '../components/styles';

export type OrderStatus = 'pending' | 'accepted' | 'packed' | 'sent' | 'delivered';

export const STATUS_INFO: Record<string, { label: string, emoji: string, color: string }> = {
  pending:   { label: 'Ожидает',         emoji: '⏳', color: '#999' },
  accepted:  { label: 'Заказ принят',    emoji: '✅', color: '#2196F3' },
  packed:    { label: 'Упакован',         emoji: '📦', color: '#FF9800' },
  sent:      { label: 'Передан курьеру', emoji: '🚚', color: '#9C27B0' },
  delivered: { label: 'Доставлен',        emoji: '🎉', color: '#4CAF50' },
  awaiting_payment_confirmation: { label: 'Ожидает оплаты', emoji: '💳', color: '#FF9800' },
};

const STATUS_STEPS: string[] = ['pending', 'accepted', 'packed', 'sent', 'delivered'];

function StatusProgress({ status, deliveryInfo }: { status: string, deliveryInfo?: any }) {
  const currentIndex = STATUS_STEPS.indexOf(status);
  return (
    <View style={{ marginVertical: 12 }}>
      {STATUS_STEPS.map((step, i) => {
        const info = STATUS_INFO[step];
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <View key={step} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', marginRight: 14 }}>
              <View style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: done ? '#FF4500' : active ? '#FF4500' : '#f0f0f0',
                justifyContent: 'center', alignItems: 'center',
                borderWidth: active ? 3 : 0,
                borderColor: active ? '#FF4500' : 'transparent',
                elevation: active ? 4 : 0,
              }}>
                {done ? (
                  <Ionicons name="checkmark" size={18} color="#fff" />
                ) : active ? (
                  <Text style={{ fontSize: 16 }}>{info.emoji}</Text>
                ) : (
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#ddd' }} />
                )}
              </View>
              {i < STATUS_STEPS.length - 1 && (
                <View style={{ width: 2, height: 28, backgroundColor: done ? '#FF4500' : '#eee', marginTop: 2 }} />
              )}
            </View>
            <View style={{ flex: 1, paddingTop: 8, paddingBottom: i < STATUS_STEPS.length - 1 ? 16 : 0 }}>
              <Text style={{
                fontWeight: active ? '800' : done ? '600' : '400',
                color: active ? '#FF4500' : done ? '#1a1a1a' : '#aaa',
                fontSize: active ? 15 : 14,
              }}>
                {info.label}
              </Text>
              {active && step === 'sent' && deliveryInfo?.deliveryDate && (
                <View style={{ backgroundColor: '#F3E5F5', borderRadius: 10, padding: 8, marginTop: 6 }}>
                  <Text style={{ color: '#9C27B0', fontSize: 12, fontWeight: '700' }}>
                    📅 Ожидайте: {deliveryInfo.deliveryDate}
                  </Text>
                  {deliveryInfo.deliveryNote && (
                    <Text style={{ color: '#7B1FA2', fontSize: 12, marginTop: 2 }}>{deliveryInfo.deliveryNote}</Text>
                  )}
                </View>
              )}
              {active && step !== 'sent' && (
                <Text style={{ color: '#FF4500', fontSize: 11, marginTop: 2, opacity: 0.8 }}>Текущий статус</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function BuyerOrderCard({ order }: { order: any }) {
  const status = order.status as string;
  const info = STATUS_INFO[status] || STATUS_INFO['pending'];

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, marginBottom: 14, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10 }}>
      <View style={{ height: 4, backgroundColor: info.color }} />
      <View style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 16, lineHeight: 22 }} numberOfLines={2}>{order.dealTitle}</Text>
            <Text style={{ color: '#999', fontSize: 13, marginTop: 3 }}>🏪 {order.storeName}</Text>
          </View>
          <View style={{ backgroundColor: info.color + '18', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: info.color + '30' }}>
            <Text style={{ color: info.color, fontWeight: '700', fontSize: 12 }}>{info.emoji} {info.label}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, backgroundColor: '#f8f8f8', borderRadius: 14, padding: 12 }}>
          <View>
            <Text style={{ color: '#999', fontSize: 11, marginBottom: 2 }}>Сумма заказа</Text>
            <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 20 }}>{Number(order.price).toLocaleString()} ₸</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            {order.selectedSize && (
              <View style={{ backgroundColor: '#FFF0EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginBottom: 4 }}>
                <Text style={{ color: '#FF4500', fontSize: 12, fontWeight: '600' }}>📏 {order.selectedSize}</Text>
              </View>
            )}
            {order.selectedColor && (
              <View style={{ backgroundColor: '#FFF0EB', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: '#FF4500', fontSize: 12, fontWeight: '600' }}>🎨 {order.selectedColor}</Text>
              </View>
            )}
            {order.paymentMethod && (
              <View style={{ backgroundColor: order.paymentMethod === 'cash' ? '#E8F5E9' : '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ color: order.paymentMethod === 'cash' ? '#4CAF50' : '#2196F3', fontSize: 12, fontWeight: '600' }}>
                  {order.paymentMethod === 'cash' ? '💵 Наличными' : '📱 Kaspi'}
                </Text>
              </View>
            )}
          </View>
        </View>

        <StatusProgress status={status} deliveryInfo={{ deliveryDate: order.deliveryDate, deliveryNote: order.deliveryNote }} />

        {/* Курьер */}
        {status === 'sent' && order.courierPhone && (
          <View style={{ backgroundColor: '#F3E5F5', borderRadius: 12, padding: 12, marginTop: 4, gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="call" size={18} color="#9C27B0" />
              <View>
                <Text style={{ color: '#9C27B0', fontWeight: '700', fontSize: 13 }}>Телефон курьера</Text>
                <Text style={{ color: '#7B1FA2', fontSize: 16, fontWeight: '800' }}>{order.courierPhone}</Text>
              </View>
            </View>
            {order.deliveryDate && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Ionicons name="calendar" size={18} color="#9C27B0" />
                <View>
                  <Text style={{ color: '#9C27B0', fontWeight: '700', fontSize: 13 }}>Ожидаемая доставка</Text>
                  <Text style={{ color: '#7B1FA2', fontSize: 15, fontWeight: '700' }}>{order.deliveryDate}</Text>
                </View>
              </View>
            )}
            {order.deliveryNote && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Ionicons name="information-circle" size={18} color="#9C27B0" />
                <Text style={{ color: '#7B1FA2', fontSize: 13, flex: 1 }}>{order.deliveryNote}</Text>
              </View>
            )}
          </View>
        )}

        {status === 'delivered' && (
          <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginTop: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 28, marginBottom: 4 }}>🎉</Text>
            <Text style={{ color: '#2E7D32', fontWeight: '800', fontSize: 15 }}>Товар доставлен!</Text>
            <Text style={{ color: '#4CAF50', fontSize: 13, marginTop: 2 }}>Спасибо за заказ в O-GO</Text>
          </View>
        )}

        {status === 'awaiting_payment_confirmation' && (
          <View style={{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 12, marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="time" size={18} color="#FF9800" />
            <Text style={{ color: '#E65100', fontWeight: '700', fontSize: 13, flex: 1 }}>Ожидаем подтверждения оплаты от продавца</Text>
          </View>
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: '#ccc', fontSize: 11 }}>Заказ #{order.id?.slice(-6).toUpperCase()}</Text>
          <Text style={{ color: '#ccc', fontSize: 11 }}>{order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : ''}</Text>
        </View>
      </View>
    </View>
  );
}

function SellerOrderCard({ order }: { order: any }) {
  const status = order.status as string;
  const info = STATUS_INFO[status] || STATUS_INFO['pending'];
  const currentIndex = STATUS_STEPS.indexOf(status);
  const nextStatus = STATUS_STEPS[currentIndex + 1];
  const [courierPhone, setCourierPhone] = useState(order.courierPhone || '');
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate || '');
  const [deliveryNote, setDeliveryNote] = useState(order.deliveryNote || '');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(status === 'pending' || status === 'awaiting_payment_confirmation');

  const updateStatus = async () => {
    if (!nextStatus) return;
    if (nextStatus === 'sent' && !courierPhone.trim()) return Alert.alert('Ошибка', 'Введите номер телефона курьера');
    if (nextStatus === 'sent' && !deliveryDate.trim()) return Alert.alert('Ошибка', 'Укажите дату/время доставки');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'orders', order.id), {
        status: nextStatus,
        ...(nextStatus === 'sent' ? { courierPhone, deliveryDate, deliveryNote } : {}),
        updatedAt: new Date().toISOString(),
        [`statusHistory.${nextStatus}`]: new Date().toISOString(),
      });
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setLoading(false);
  };

  return (
    <View style={{ backgroundColor: '#fff', borderRadius: 20, marginBottom: 14, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10 }}>
      <View style={{ height: 4, backgroundColor: info.color }} />

      <TouchableOpacity onPress={() => setExpanded(!expanded)} style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 16 }} numberOfLines={1}>{order.dealTitle}</Text>
            <Text style={{ color: '#999', fontSize: 13, marginTop: 3 }}>👤 {order.buyerEmail?.split('@')[0]}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 18 }}>{Number(order.price).toLocaleString()} ₸</Text>
            <View style={{ backgroundColor: info.color + '18', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: info.color + '30' }}>
              <Text style={{ color: info.color, fontWeight: '700', fontSize: 11 }}>{info.emoji} {info.label}</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: '#f8f8f8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="location-outline" size={12} color="#999" />
            <Text style={{ color: '#666', fontSize: 12 }} numberOfLines={1}>{order.city || order.address?.split(',')[0]}</Text>
          </View>
          <View style={{ backgroundColor: order.paymentMethod === 'cash' ? '#E8F5E9' : '#E3F2FD', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: order.paymentMethod === 'cash' ? '#4CAF50' : '#2196F3', fontSize: 12, fontWeight: '600' }}>
              {order.paymentMethod === 'cash' ? '💵 Наличными' : '📱 Kaspi'}
            </Text>
          </View>
          {order.selectedSize && (
            <View style={{ backgroundColor: '#FFF0EB', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#FF4500', fontSize: 12, fontWeight: '600' }}>📏 {order.selectedSize}</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: '#ccc', fontSize: 11 }}>#{order.id?.slice(-6).toUpperCase()} · {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ru-RU') : ''}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#ccc" />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={{ height: 1, backgroundColor: '#f0f0f0', marginBottom: 14 }} />

          <View style={{ backgroundColor: '#f8f8f8', borderRadius: 14, padding: 12, marginBottom: 14 }}>
            <Text style={{ fontWeight: '700', color: '#1a1a1a', marginBottom: 8, fontSize: 13 }}>📋 Детали заказа</Text>
            <Text style={{ color: '#555', fontSize: 13 }}>👤 {order.buyerEmail}</Text>
            <Text style={{ color: '#555', fontSize: 13 }}>📍 {order.address}</Text>
            <Text style={{ color: '#555', fontSize: 13 }}>📱 {order.phone}</Text>
          </View>

          {order.comment && (
            <View style={{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row', gap: 8 }}>
              <Ionicons name="chatbubble-outline" size={16} color="#FF9800" />
              <Text style={{ color: '#555', fontSize: 13, flex: 1 }}>{order.comment}</Text>
            </View>
          )}

          <StatusProgress status={status} deliveryInfo={{ deliveryDate: order.deliveryDate, deliveryNote: order.deliveryNote }} />

          {order.paymentMethod === 'kaspi' && order.receiptImage && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontWeight: '700', color: '#FF9800', fontSize: 13, marginBottom: 8 }}>📸 Чек об оплате Kaspi</Text>
              <Image source={{ uri: order.receiptImage }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="contain" />
              {order.paymentStatus === 'awaiting_confirmation' && (
                <TouchableOpacity
                  onPress={async () => {
                    await updateDoc(doc(db, 'orders', order.id), {
                      paymentStatus: 'confirmed',
                      status: 'pending',
                      updatedAt: new Date().toISOString(),
                    });
                    Alert.alert('✅ Оплата подтверждена!', 'Заказ переведён в работу');
                  }}
                  style={{ backgroundColor: '#4CAF50', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Подтвердить получение оплаты</Text>
                </TouchableOpacity>
              )}
              {order.paymentStatus === 'confirmed' && (
                <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={{ color: '#2E7D32', fontWeight: '700' }}>Оплата подтверждена</Text>
                </View>
              )}
            </View>
          )}

          {/* Поля для передачи курьеру */}
          {nextStatus === 'sent' && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontWeight: '800', color: '#1a1a1a', fontSize: 14, marginBottom: 12 }}>🚚 Информация о доставке</Text>

              {/* Телефон курьера */}
              <Text style={{ fontWeight: '600', color: '#555', fontSize: 13, marginBottom: 6 }}>📱 Телефон курьера *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#eee', marginBottom: 12 }}>
                <Ionicons name="call-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#1a1a1a' }}
                  placeholder="+7 777 123 45 67"
                  value={courierPhone}
                  onChangeText={setCourierPhone}
                  keyboardType="phone-pad"
                  placeholderTextColor="#ccc"
                />
              </View>

              {/* Дата/время доставки */}
              <Text style={{ fontWeight: '600', color: '#555', fontSize: 13, marginBottom: 6 }}>📅 Когда приедет курьер *</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 12, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#eee', marginBottom: 12 }}>
                <Ionicons name="calendar-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#1a1a1a' }}
                  placeholder="Например: Завтра 15 сентября, 14:00-16:00"
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholderTextColor="#ccc"
                />
              </View>

              {/* Заметка покупателю */}
              <Text style={{ fontWeight: '600', color: '#555', fontSize: 13, marginBottom: 6 }}>💬 Сообщение покупателю (необязательно)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#f8f8f8', borderRadius: 12, paddingHorizontal: 14, paddingTop: 4, borderWidth: 1.5, borderColor: '#eee', marginBottom: 8 }}>
                <Ionicons name="chatbubble-outline" size={18} color="#aaa" style={{ marginRight: 8, marginTop: 10 }} />
                <TextInput
                  style={{ flex: 1, paddingVertical: 10, fontSize: 14, color: '#1a1a1a', minHeight: 60 }}
                  placeholder="Например: Курьер позвонит за 30 минут до прибытия"
                  value={deliveryNote}
                  onChangeText={setDeliveryNote}
                  multiline
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={{ backgroundColor: '#E8F5E9', borderRadius: 10, padding: 10 }}>
                <Text style={{ color: '#22C55E', fontSize: 12 }}>
                  💡 Покупатель увидит дату и время прямо в своих заказах
                </Text>
              </View>
            </View>
          )}

          {nextStatus ? (
            loading ? <ActivityIndicator color="#FF4500" /> : (
              <TouchableOpacity
                style={{ backgroundColor: '#FF4500', borderRadius: 14, padding: 15, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, elevation: 3 }}
                onPress={updateStatus}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>
                  {STATUS_INFO[nextStatus]?.emoji} → {STATUS_INFO[nextStatus]?.label}
                </Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={{ backgroundColor: '#E8F5E9', borderRadius: 14, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={{ color: '#2E7D32', fontWeight: '700', fontSize: 15 }}>Заказ выполнен!</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export function BuyerOrdersScreen({ user }: { user: User }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('buyerId', '==', user.uid));
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    });
  }, [user]);

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const displayed = filter === 'active' ? activeOrders : orders;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>📦 Мои заказы</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 }}>
          {activeOrders.length > 0 ? `${activeOrders.length} активных заказов` : 'Нет активных заказов'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', elevation: 2 }}>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: filter === 'active' ? '#FF4500' : '#f5f5f5', alignItems: 'center' }} onPress={() => setFilter('active')}>
          <Text style={{ color: filter === 'active' ? '#fff' : '#666', fontWeight: '700' }}>🔔 Активные ({activeOrders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: filter === 'all' ? '#FF4500' : '#f5f5f5', alignItems: 'center' }} onPress={() => setFilter('all')}>
          <Text style={{ color: filter === 'all' ? '#fff' : '#666', fontWeight: '700' }}>📋 Все ({orders.length})</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {displayed.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 64, marginBottom: 16 }}>📭</Text>
            <Text style={{ color: '#1a1a1a', fontWeight: '800', fontSize: 18, marginBottom: 6 }}>
              {filter === 'active' ? 'Нет активных заказов' : 'Заказов пока нет'}
            </Text>
            <Text style={{ color: '#999', textAlign: 'center', fontSize: 14 }}>Найдите скидки и сделайте первый заказ!</Text>
          </View>
        ) : displayed.map(order => <BuyerOrderCard key={order.id} order={order} />)}
      </ScrollView>
    </View>
  );
}

export function SellerOrdersScreen({ user }: { user: User }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  useEffect(() => {
    const q = query(collection(db, 'orders'), where('sellerId', '==', user.uid));
    return onSnapshot(q, snap => {
      setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()));
    });
  }, [user]);

  const activeOrders = orders.filter(o => o.status !== 'delivered');
  const displayed = filter === 'active' ? activeOrders : orders;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#222' }}>📦 Управление заказами</Text>
        {activeOrders.length > 0 && (
          <View style={{ backgroundColor: '#FF4500', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{activeOrders.length} новых</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: filter === 'active' ? '#FF4500' : '#fff', alignItems: 'center', elevation: 1 }} onPress={() => setFilter('active')}>
          <Text style={{ color: filter === 'active' ? '#fff' : '#666', fontWeight: '600' }}>🔔 Активные ({activeOrders.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: filter === 'all' ? '#FF4500' : '#fff', alignItems: 'center', elevation: 1 }} onPress={() => setFilter('all')}>
          <Text style={{ color: filter === 'all' ? '#fff' : '#666', fontWeight: '600' }}>📋 Все ({orders.length})</Text>
        </TouchableOpacity>
      </View>
      {displayed.length === 0 ? (
        <View style={[styles.center, { marginTop: 40 }]}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
          <Text style={{ color: '#aaa', textAlign: 'center', fontSize: 16 }}>{filter === 'active' ? 'Нет активных заказов' : 'Заказов пока нет'}</Text>
        </View>
      ) : displayed.map(order => <SellerOrderCard key={order.id} order={order} />)}
    </ScrollView>
  );
}
