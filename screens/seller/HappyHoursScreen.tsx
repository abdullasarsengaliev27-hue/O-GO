import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Switch, Alert, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from 'firebase/auth';
import { styles } from '../../components/styles';
import * as ImagePicker from 'expo-image-picker';

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export function HappyHoursScreen({ user }: { user: User }) {
  const [happyHours, setHappyHours] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [discount, setDiscount] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('20:00');
  const [endTime, setEndTime] = useState('21:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([0,1,2,3,4,5,6]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'happyHours'), where('sellerId', '==', user.uid));
    return onSnapshot(q, snap => {
      setHappyHours(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
  }, [user]);

  const isActiveNow = (hh: any) => {
    const now = new Date();
    const currentDay = (now.getDay() + 6) % 7;
    const currentHour = `${String(now.getHours()).padStart(2, '0')}:00`;
    return hh.days.includes(currentDay) && currentHour >= hh.startTime && currentHour < hh.endTime;
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к фото');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.7 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setImageUri(uri);
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>(resolve => { reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); });
      setImageBase64(base64);
    }
  };

  const toggleDay = (day: number) => setSelectedDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);

  const saveHappyHours = async () => {
    if (!title || !discount || selectedDays.length === 0) return Alert.alert('Ошибка', 'Заполни все поля');
    setSaving(true);
    try {
      await addDoc(collection(db, 'happyHours'), { sellerId: user.uid, title, discount: Number(discount), description, startTime, endTime, days: selectedDays, imageUrl: imageBase64 || null, isActive: true, createdAt: new Date().toISOString() });
      await addDoc(collection(db, 'broadcastNotifications'), { type: 'happy_hours', title: '⚡ Счастливые часы!', body: `${title} — скидка ${discount}% с ${startTime} до ${endTime}`, sellerId: user.uid, createdAt: new Date().toISOString() });
      Alert.alert('✅ Создано!', 'Покупатели увидят акцию на главной');
      setTitle(''); setDiscount(''); setDescription(''); setStartTime('20:00'); setEndTime('21:00'); setSelectedDays([0,1,2,3,4,5,6]); setImageUri(null); setImageBase64(null); setShowForm(false);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setSaving(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF4500" /></View>;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ padding: 16 }}>
      <View style={{ backgroundColor: '#FF4500', borderRadius: 16, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>⚡ Счастливые часы</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 }}>Покупатели видят акцию на главной + получают уведомление</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>{happyHours.filter(h => h.isActive).length}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Активных</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 20 }}>{happyHours.filter(h => isActiveNow(h)).length}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Сейчас идут</Text>
          </View>
        </View>
      </View>

      {!showForm && <TouchableOpacity style={[styles.bigBtn, { marginBottom: 16 }]} onPress={() => setShowForm(true)}><Text style={styles.bigBtnText}>+ Создать счастливые часы</Text></TouchableOpacity>}

      {showForm && (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 17, marginBottom: 14 }}>⚡ Новая акция</Text>
          <Text style={styles.label}>Фото акции</Text>
          <TouchableOpacity onPress={pickImage} style={{ height: 160, borderRadius: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', overflow: 'hidden' }}>
            {imageUri ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: 160 }} resizeMode="cover" /> : <View style={{ alignItems: 'center' }}><Ionicons name="camera" size={36} color="#FF4500" /><Text style={{ color: '#FF4500', fontWeight: '600', marginTop: 8 }}>Добавить фото акции</Text><Text style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>Покупатели увидят это на главной</Text></View>}
          </TouchableOpacity>
          <Text style={styles.label}>Название акции *</Text>
          <TextInput style={styles.input} placeholder="Скидка на выпечку..." value={title} onChangeText={setTitle} placeholderTextColor="#aaa" />
          <Text style={styles.label}>Скидка (%) *</Text>
          <TextInput style={styles.input} placeholder="50" value={discount} onChangeText={setDiscount} keyboardType="numeric" placeholderTextColor="#aaa" />
          <Text style={styles.label}>Описание</Text>
          <TextInput style={[styles.input, { height: 70 }]} placeholder="На всю выпечку и горячие напитки..." value={description} onChangeText={setDescription} multiline placeholderTextColor="#aaa" />
          <Text style={styles.label}>Время начала</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {HOURS.map(h => (<TouchableOpacity key={h} onPress={() => setStartTime(h)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8, backgroundColor: startTime === h ? '#FF4500' : '#f0f0f0' }}><Text style={{ color: startTime === h ? '#fff' : '#333', fontWeight: '600' }}>{h}</Text></TouchableOpacity>))}
          </ScrollView>
          <Text style={styles.label}>Время окончания</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
            {HOURS.map(h => (<TouchableOpacity key={h} onPress={() => setEndTime(h)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8, backgroundColor: endTime === h ? '#FF4500' : '#f0f0f0' }}><Text style={{ color: endTime === h ? '#fff' : '#333', fontWeight: '600' }}>{h}</Text></TouchableOpacity>))}
          </ScrollView>
          <Text style={styles.label}>Дни недели</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
            {DAYS.map((day, i) => (<TouchableOpacity key={i} onPress={() => toggleDay(i)} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: selectedDays.includes(i) ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}><Text style={{ color: selectedDays.includes(i) ? '#fff' : '#666', fontWeight: 'bold', fontSize: 11 }}>{day}</Text></TouchableOpacity>))}
          </View>
          {title && discount && (<View style={{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#FFD700' }}><Text style={{ fontWeight: 'bold', color: '#333', marginBottom: 4 }}>👁 Превью:</Text><Text style={{ color: '#333' }}>⚡ {title} — -{discount}%</Text><Text style={{ color: '#666', fontSize: 13 }}>{startTime} — {endTime}</Text></View>)}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity style={[styles.bigBtn, { flex: 1, backgroundColor: '#f0f0f0' }]} onPress={() => setShowForm(false)}><Text style={[styles.bigBtnText, { color: '#666' }]}>Отмена</Text></TouchableOpacity>
            {saving ? <ActivityIndicator color="#FF4500" style={{ flex: 1 }} /> : <TouchableOpacity style={[styles.bigBtn, { flex: 1 }]} onPress={saveHappyHours}><Text style={styles.bigBtnText}>Создать ⚡</Text></TouchableOpacity>}
          </View>
        </View>
      )}

      {happyHours.length === 0 ? (
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center' }}><Text style={{ fontSize: 48, marginBottom: 12 }}>⚡</Text><Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16 }}>Нет счастливых часов</Text></View>
      ) : happyHours.map(hh => {
        const activeNow = isActiveNow(hh);
        return (
          <View key={hh.id} style={{ backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, overflow: 'hidden', elevation: 2 }}>
            <View style={{ height: 4, backgroundColor: activeNow ? '#4CAF50' : hh.isActive ? '#FF4500' : '#ccc' }} />
            {hh.imageUrl && <Image source={{ uri: hh.imageUrl }} style={{ width: '100%', height: 140 }} resizeMode="cover" />}
            <View style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  {activeNow && <View style={{ backgroundColor: '#4CAF50', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>🟢 Идёт прямо сейчас!</Text></View>}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <View style={{ backgroundColor: '#FF4500', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}><Text style={{ color: '#fff', fontWeight: 'bold' }}>-{hh.discount}%</Text></View>
                    <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, flex: 1 }}>{hh.title}</Text>
                  </View>
                  {hh.description && <Text style={{ color: '#999', fontSize: 13, marginBottom: 6 }}>{hh.description}</Text>}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Ionicons name="time" size={14} color="#FF4500" /><Text style={{ color: '#FF4500', fontWeight: '600' }}>{hh.startTime} — {hh.endTime}</Text></View>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                    {DAYS.map((day, i) => (<View key={i} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: hh.days.includes(i) ? '#FFF0EB' : '#f5f5f5' }}><Text style={{ fontSize: 11, color: hh.days.includes(i) ? '#FF4500' : '#ccc', fontWeight: hh.days.includes(i) ? 'bold' : 'normal' }}>{day}</Text></View>))}
                  </View>
                </View>
                <Switch value={hh.isActive} onValueChange={() => updateDoc(doc(db, 'happyHours', hh.id), { isActive: !hh.isActive })} trackColor={{ false: '#ddd', true: '#FF4500' }} thumbColor="#fff" />
              </View>
              <TouchableOpacity onPress={() => { Alert.alert('Удалить?', hh.title, [{ text: 'Отмена', style: 'cancel' }, { text: 'Удалить', style: 'destructive', onPress: () => deleteDoc(doc(db, 'happyHours', hh.id)) }]); }} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, backgroundColor: '#FFF0EB', borderRadius: 10, paddingVertical: 10, gap: 6, borderWidth: 1, borderColor: '#FF4500' }}>
                <Ionicons name="trash" size={16} color="#FF4500" />
                <Text style={{ color: '#FF4500', fontWeight: '600' }}>Удалить акцию</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}
