import { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { styles } from './styles';

const TIMES = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const GUESTS = ['1', '2', '3', '4', '5', '6+'];

export function BookingModal({ deal, user, visible, onClose }: { deal: any, user: User | null, visible: boolean, onClose: () => void }) {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [guests, setGuests] = useState('2');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Генерируем ближайшие 7 дней
  const dates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      date: d.toISOString().split('T')[0],
      label: i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : d.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' }),
    };
  });

  const placeBooking = async () => {
    if (!user) return Alert.alert('Войдите', 'Чтобы забронировать столик');
    if (!selectedDate || !selectedTime || !name || !phone) return Alert.alert('Ошибка', 'Заполни все поля');
    setLoading(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        dealId: deal.id,
        dealTitle: deal.title,
        storeName: deal.store,
        sellerId: deal.sellerId,
        buyerId: user.uid,
        buyerEmail: user.email,
        date: selectedDate,
        time: selectedTime,
        guests, name, phone, comment,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      await addDoc(collection(db, 'notifications'), {
        toUserId: deal.sellerId,
        type: 'booking',
        title: '🗓 Новое бронирование!',
        body: `${name} бронирует столик на ${selectedDate} в ${selectedTime} (${guests} гостей)`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('✅ Столик забронирован!', `${selectedDate} в ${selectedTime}\nНа ${guests} гостей\n\nЗаведение подтвердит бронь.`);
      onClose();
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setLoading(false);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ backgroundColor: '#4CAF50', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>🗓 Бронирование столика</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>

          {/* Заведение */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16 }}>{deal?.title}</Text>
            <Text style={{ color: '#999', fontSize: 13 }}>🏪 {deal?.store} · 📍 {deal?.city}</Text>
            {deal?.workingHours && <Text style={{ color: '#4CAF50', fontSize: 13, marginTop: 4 }}>⏰ Работает: {deal.workingHours}</Text>}
          </View>

          {/* Дата */}
          <Text style={[styles.label, { fontSize: 15 }]}>📅 Выберите дату</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {dates.map(d => (
              <TouchableOpacity key={d.date} onPress={() => setSelectedDate(d.date)}
                style={{ marginRight: 10, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: selectedDate === d.date ? '#4CAF50' : '#fff', elevation: 1, alignItems: 'center', minWidth: 80 }}>
                <Text style={{ color: selectedDate === d.date ? '#fff' : '#666', fontWeight: '600', fontSize: 13 }}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Время */}
          <Text style={[styles.label, { fontSize: 15 }]}>⏰ Выберите время</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {TIMES.map(t => (
              <TouchableOpacity key={t} onPress={() => setSelectedTime(t)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: selectedTime === t ? '#4CAF50' : '#f0f0f0' }}>
                <Text style={{ color: selectedTime === t ? '#fff' : '#333', fontWeight: '600' }}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Гости */}
          <Text style={[styles.label, { fontSize: 15 }]}>👥 Количество гостей</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {GUESTS.map(g => (
              <TouchableOpacity key={g} onPress={() => setGuests(g)}
                style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: guests === g ? '#4CAF50' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: guests === g ? '#fff' : '#333', fontWeight: 'bold', fontSize: 16 }}>{g}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Контакты */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 16 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 12 }}>📋 Ваши данные</Text>
            <Text style={styles.label}>Имя *</Text>
            <TextInput style={styles.input} placeholder="Иван Иванов" value={name} onChangeText={setName} placeholderTextColor="#aaa" />
            <Text style={styles.label}>Телефон *</Text>
            <TextInput style={styles.input} placeholder="+7 777 123 45 67" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#aaa" />
            <Text style={styles.label}>Пожелания</Text>
            <TextInput style={[styles.input, { height: 70 }]} placeholder="Столик у окна, день рождения..." value={comment} onChangeText={setComment} multiline placeholderTextColor="#aaa" />
          </View>

          {/* Итог */}
          {selectedDate && selectedTime && (
            <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 15, marginBottom: 6 }}>✅ Детали брони:</Text>
              <Text style={{ color: '#333' }}>📅 {selectedDate} в {selectedTime}</Text>
              <Text style={{ color: '#333' }}>👥 {guests} гостей</Text>
              <Text style={{ color: '#333' }}>🏪 {deal?.store}</Text>
            </View>
          )}

          {loading
            ? <ActivityIndicator size="large" color="#4CAF50" />
            : <TouchableOpacity style={[styles.bigBtn, { backgroundColor: '#4CAF50' }]} onPress={placeBooking}>
                <Text style={styles.bigBtnText}>🗓 Забронировать столик</Text>
              </TouchableOpacity>
          }
        </ScrollView>
      </View>
    </Modal>
  );
}
