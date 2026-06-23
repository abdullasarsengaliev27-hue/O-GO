import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { styles } from '../components/styles';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '../utils/uploadImage';

const BUSINESS_CATEGORIES = [
  { id: 'clothing', label: 'Одежда и Обувь', emoji: '👕' },
  { id: 'food', label: 'Еда и рестораны', emoji: '🍔' },
  { id: 'tech', label: 'Техника и гаджеты', emoji: '💻' },
  { id: 'beauty', label: 'Косметика и парфюм', emoji: '💄' },
  { id: 'general', label: 'Магазины', emoji: '📦' },
];

const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Актау', 'Актобе', 'Атырау', 'Павлодар', 'Караганда'];

const validateName = (name: string) => {
  if (!name.trim()) return 'Обязательное поле';
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return 'Введи имя и фамилию (два слова)';
  if (!/^[а-яёА-ЯЁa-zA-Z\s-]+$/.test(name)) return 'Только буквы, без цифр и символов';
  return null;
};

const validatePhone = (phone: string) => {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (!cleaned) return 'Обязательное поле';
  if (!/^\+?[0-9]{10,12}$/.test(cleaned)) return 'Формат: +7 777 123 45 67';
  return null;
};

export function SellerApplicationScreen({ onBack }: { onBack: () => void }) {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [storePhoto, setStorePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
setStorePhoto(uri);
    }
  };

  const submitApplication = async () => {
    if (!fullName || !phone || !email || !storeName || !storeCategory || !city || !address) {
      return Alert.alert('Ошибка', 'Заполни все обязательные поля');
    }
    setLoading(true);
    try {
      let storePhotoUrl = storePhoto || null;
      await addDoc(collection(db, 'sellerApplications'), {
        fullName, phone, email,
        storeName, storeCategory, city, address, description,
        storePhoto: storePhotoUrl,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setStep(4);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
    setLoading(false);
  };

  if (step === 4) return (
    <View style={[styles.center, { padding: 32 }]}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'center', marginBottom: 12 }}>
        Заявка отправлена!
      </Text>
      <Text style={{ color: '#666', textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 24 }}>
        Мы проверим ваш бизнес в течение 1-2 рабочих дней и отправим доступ на email:{'\n'}
        <Text style={{ fontWeight: 'bold', color: '#FF4500' }}>{email}</Text>
      </Text>
      <View style={{ backgroundColor: '#FFF0EB', borderRadius: 14, padding: 16, marginBottom: 24, width: '100%' }}>
        <Text style={{ fontWeight: 'bold', color: '#FF4500', marginBottom: 8 }}>📋 Что дальше:</Text>
        <Text style={{ color: '#555', fontSize: 14 }}>1. Администратор проверит ваш магазин</Text>
        <Text style={{ color: '#555', fontSize: 14 }}>2. Вы получите email с паролем</Text>
        <Text style={{ color: '#555', fontSize: 14 }}>3. Войдите и начните добавлять скидки</Text>
      </View>
      <TouchableOpacity style={styles.bigBtn} onPress={onBack}>
        <Text style={styles.bigBtnText}>Понятно, вернуться назад</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#FF4500', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={step === 1 ? onBack : () => setStep(step - 1)}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Заявка продавца</Text>
      </View>

      {/* Прогресс */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
        {[1, 2, 3].map(s => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: s <= step ? '#FF4500' : '#ddd' }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Шаг 1 — Контакты */}
        {step === 1 && (
          <>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 6 }}>👤 Ваши контакты</Text>
            <Text style={{ color: '#999', marginBottom: 20 }}>Шаг 1 из 3 — Личная информация</Text>

            <Text style={styles.label}>ФИО *</Text>
            <TextInput style={styles.input} placeholder="Иванов Иван Иванович" value={fullName} onChangeText={setFullName} placeholderTextColor="#aaa" />

            <Text style={styles.label}>Телефон *</Text>
            <TextInput style={styles.input} placeholder="+7 777 123 45 67" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#aaa" />



            <Text style={styles.label}>Email *</Text>
            <TextInput style={styles.input} placeholder="your@email.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#aaa" />

            <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <Text style={{ color: '#4CAF50', fontSize: 13 }}>
                ✅ На этот email придёт подтверждение и пароль от аккаунта продавца
              </Text>
            </View>

            <TouchableOpacity style={styles.bigBtn} onPress={() => {
              if (!fullName || !phone || !email) return Alert.alert('Ошибка', 'Заполни все поля');
              const nameError = validateName(fullName);
if (nameError) return Alert.alert('Ошибка', nameError);
              
              setStep(2);
            }}>
              <Text style={styles.bigBtnText}>Далее →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Шаг 2 — Бизнес */}
        {step === 2 && (
          <>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 6 }}>🏪 О вашем бизнесе</Text>
            <Text style={{ color: '#999', marginBottom: 20 }}>Шаг 2 из 3 — Информация о магазине</Text>

            <Text style={styles.label}>Название магазина *</Text>
            <TextInput style={styles.input} placeholder="Nike Store / Шаурма Лэнд" value={storeName} onChangeText={setStoreName} placeholderTextColor="#aaa" />

            <Text style={styles.label}>Категория бизнеса *</Text>
            {BUSINESS_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setStoreCategory(cat.id)}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: storeCategory === cat.id ? '#FF4500' : '#fff', borderWidth: 2, borderColor: storeCategory === cat.id ? '#FF4500' : '#eee' }}
              >
                <Text style={{ fontSize: 24, marginRight: 12 }}>{cat.emoji}</Text>
                <Text style={{ fontWeight: '600', fontSize: 15, color: storeCategory === cat.id ? '#fff' : '#222' }}>{cat.label}</Text>
                {storeCategory === cat.id && <Ionicons name="checkmark-circle" size={22} color="#fff" style={{ marginLeft: 'auto' }} />}
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={[styles.bigBtn, { marginTop: 8 }]} onPress={() => {
              if (!storeName || !storeCategory) return Alert.alert('Ошибка', 'Заполни все поля');
              setStep(3);
            }}>
              <Text style={styles.bigBtnText}>Далее →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Шаг 3 — Адрес и фото */}
        {step === 3 && (
          <>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', marginBottom: 6 }}>📍 Адрес и фото</Text>
            <Text style={{ color: '#999', marginBottom: 20 }}>Шаг 3 из 3 — Местоположение</Text>

            <Text style={styles.label}>Город *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {CITIES.map(c => (
                <TouchableOpacity key={c} onPress={() => setCity(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: city === c ? '#FF4500' : '#f0f0f0' }}>
                  <Text style={{ color: city === c ? '#fff' : '#333', fontWeight: '600' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.label}>Адрес магазина *</Text>
            <TextInput style={styles.input} placeholder="ул. Абая 45 / 30 мкр, дом 12" value={address} onChangeText={setAddress} placeholderTextColor="#aaa" />

            <Text style={styles.label}>Описание бизнеса</Text>
            <TextInput style={[styles.input, { height: 80 }]} placeholder="Расскажите о вашем магазине..." value={description} onChangeText={setDescription} multiline placeholderTextColor="#aaa" />

            <Text style={styles.label}>Фото магазина</Text>
            <TouchableOpacity onPress={pickPhoto} style={{ height: 140, borderRadius: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', overflow: 'hidden' }}>
              {storePhoto
                ? <Image source={{ uri: storePhoto }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                : <View style={{ alignItems: 'center' }}>
                    <Ionicons name="camera" size={32} color="#FF4500" />
                    <Text style={{ color: '#FF4500', marginTop: 6 }}>Добавить фото магазина</Text>
                  </View>
              }
            </TouchableOpacity>

            {loading
              ? <ActivityIndicator size="large" color="#FF4500" />
              : <TouchableOpacity style={styles.bigBtn} onPress={submitApplication}>
                  <Text style={styles.bigBtnText}>📨 Отправить заявку</Text>
                </TouchableOpacity>
            }
          </>
        )}
      </ScrollView>
    </View>
  );
}
