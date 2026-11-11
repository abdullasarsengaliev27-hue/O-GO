import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { styles } from '../components/styles';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { PrivacyPolicyScreen } from './PrivacyPolicyScreen';

const BUSINESS_CATEGORIES = [
  { id: 'clothing', label: 'Одежда и Обувь', emoji: '👕' },
  { id: 'food', label: 'Еда и рестораны', emoji: '🍔' },
  { id: 'tech', label: 'Техника и гаджеты', emoji: '💻' },
  { id: 'beauty', label: 'Косметика и парфюм', emoji: '💄' },
];

const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Актау', 'Актобе', 'Атырау', 'Павлодар', 'Караганда'];

const validateName = (name: string) => {
  if (!name.trim()) return 'Обязательное поле';
  const words = name.trim().split(/\s+/);
  if (words.length < 2) return 'Введи имя и фамилию (два слова)';
  if (!/^[а-яёА-ЯЁa-zA-Z\s-]+$/.test(name)) return 'Только буквы, без цифр и символов';
  return null;
};

export function SellerApplicationScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [storePhoto, setStorePhoto] = useState<string | null>(null); // base64
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к фото');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.7,
    });
    if (result.canceled) return;

    setPhotoLoading(true);
    try {
      const resized = await ImageManipulator.manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: 800, height: 600 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );
      const response = await fetch(resized.uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Не удалось прочитать фото'));
        reader.readAsDataURL(blob);
      });
      setStorePhoto(base64);
    } catch (e: any) {
      Alert.alert('Ошибка', 'Не удалось обработать фото. Попробуй другое.');
    }
    setPhotoLoading(false);
  };

  const submitApplication = async () => {
    if (!fullName || !phone || !email || !storeName || !storeCategory || !city || !address) {
      return Alert.alert('Ошибка', 'Заполни все обязательные поля');
    }
    if (!agreed) {
      return Alert.alert('Ошибка', 'Необходимо принять политику конфиденциальности и согласие на обработку персональных данных');
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'sellerApplications'), {
        fullName: fullName.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        storeName: storeName.trim(),
        storeCategory, city,
        address: address.trim(),
        description: description.trim(),
        storePhoto: storePhoto || null,
        agreedToPolicy: true,
        policyAcceptedAt: new Date().toISOString(),
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
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: insets.top + 24, backgroundColor: '#f5f5f5' }}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>🎉</Text>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#222', textAlign: 'center', marginBottom: 12 }}>
        Заявка отправлена!
      </Text>
      <Text style={{ color: '#666', textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 24 }}>
        Мы проверим ваш бизнес в течение 1-2 рабочих дней.{'\n'}
        Ваш email для входа:{'\n'}
        <Text style={{ fontWeight: 'bold', color: '#FF4500' }}>{email.trim()}</Text>
      </Text>
      <View style={{ backgroundColor: '#FFF0EB', borderRadius: 14, padding: 16, marginBottom: 24, width: '100%' }}>
        <Text style={{ fontWeight: 'bold', color: '#FF4500', marginBottom: 8 }}>📋 Что дальше:</Text>
        <Text style={{ color: '#555', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>1. Администратор проверит ваш магазин и одобрит заявку</Text>
        <Text style={{ color: '#555', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>2. Откройте «Войти как продавец» → «Войти в кабинет продавца»</Text>
        <Text style={{ color: '#555', fontSize: 14, lineHeight: 20, marginBottom: 4 }}>3. Введите этот email, придумайте пароль и нажмите «Зарегистрироваться»</Text>
        <Text style={{ color: '#555', fontSize: 14, lineHeight: 20 }}>4. Добавляйте скидки в своём кабинете</Text>
      </View>
      <Text style={{ color: '#999', fontSize: 12, textAlign: 'center', marginBottom: 20 }}>
        Пока заявка не одобрена, регистрация кабинета недоступна.
      </Text>
      <TouchableOpacity style={[styles.bigBtn, { width: '100%' }]} onPress={onBack}>
        <Text style={styles.bigBtnText}>Понятно, вернуться назад</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={step === 1 ? onBack : () => setStep(step - 1)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={26} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Заявка продавца</Text>
      </View>

      <View style={{ flexDirection: 'row', padding: 16, gap: 8 }}>
        {[1, 2, 3].map(s => (
          <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: s <= step ? '#FF4500' : '#ddd' }} />
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
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
                ✅ С этим email вы войдёте в кабинет продавца после одобрения заявки
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
            <TouchableOpacity onPress={pickPhoto} disabled={photoLoading} style={{ height: 140, borderRadius: 12, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', overflow: 'hidden' }}>
              {photoLoading
                ? <ActivityIndicator color="#FF4500" />
                : storePhoto
                  ? <Image source={{ uri: storePhoto }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                  : <View style={{ alignItems: 'center' }}>
                      <Ionicons name="camera" size={32} color="#FF4500" />
                      <Text style={{ color: '#FF4500', marginTop: 6 }}>Добавить фото магазина</Text>
                    </View>
              }
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAgreed(!agreed)}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: agreed ? '#F0FFF4' : '#fff', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: agreed ? '#22C55E' : '#eee', marginBottom: 16 }}
            >
              <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: agreed ? '#22C55E' : '#fff', borderWidth: 2, borderColor: agreed ? '#22C55E' : '#ddd', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
                {agreed && <Ionicons name="checkmark" size={14} color="#fff" />}
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

            {loading
              ? <ActivityIndicator size="large" color="#FF4500" />
              : <TouchableOpacity style={styles.bigBtn} onPress={submitApplication}>
                  <Text style={styles.bigBtnText}>📨 Отправить заявку</Text>
                </TouchableOpacity>
            }
            <View style={{ height: 24 }} />
          </>
        )}
      </ScrollView>

      <Modal visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)}>
        <PrivacyPolicyScreen onClose={() => setShowPolicy(false)} />
      </Modal>
    </View>
  );
}
