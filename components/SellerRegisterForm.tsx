import { useState, useEffect } from 'react';import { View, Text, TextInput, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { styles } from './styles';


const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Актау', 'Актобе', 'Атырау', 'Павлодар', 'Караганда', 'Тараз', 'Усть-Каменогорск'];

const BUSINESS_CATEGORIES = [
  { id: 'clothing', label: 'Одежда и Обувь', emoji: '👕', desc: 'Бутики, магазины одежды, обуви' },
  { id: 'food', label: 'Еда и рестораны', emoji: '🍔', desc: 'Кафе, фастфуд, рестораны, донерные' },
  { id: 'tech', label: 'Техника и гаджеты', emoji: '💻', desc: 'Электроника, гаджеты, аксессуары' },
  { id: 'beauty', label: 'Косметика и парфюм', emoji: '💄', desc: 'Косметика, уход, парфюмерия' },
  { id: 'general', label: 'Магазины', emoji: '📦', desc: 'Товары для дома, канцтовары, подарки' },
];

export function SellerRegisterForm({ storeName, setStoreName, storeAddress, setStoreAddress, storeCategory, setStoreCategory, storePhone, setStorePhone, storeDescription, setStoreDescription, storeLogoUri, setStoreLogoUri }: any) {
  const [selectedCity, setSelectedCity] = useState('');
  const [street, setStreet] = useState('');
  const [house, setHouse] = useState('');

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.7,
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
      setStoreLogoUri(base64);
    }
  };

  const fullAddress = [selectedCity, street, house].filter(Boolean).join(', ');

  useEffect(() => {
    setStoreAddress(fullAddress);
  }, [selectedCity, street, house]);

  return (
    <View>
      {/* Логотип */}
      <Text style={[styles.label, { marginTop: 8 }]}>Логотип магазина</Text>
      <TouchableOpacity onPress={pickLogo} style={{ alignSelf: 'center', marginBottom: 20 }}>
        <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF0EB', borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {storeLogoUri
            ? <Image source={{ uri: storeLogoUri }} style={{ width: 90, height: 90 }} resizeMode="cover" />
            : <><Ionicons name="camera" size={28} color="#FF4500" /><Text style={{ color: '#FF4500', fontSize: 10, marginTop: 2 }}>Лого</Text></>
          }
        </View>
      </TouchableOpacity>

      {/* Название */}
      <Text style={styles.label}>Название магазина *</Text>
      <TextInput style={styles.input} placeholder="Nike Store / Шаурма Лэнд" value={storeName} onChangeText={setStoreName} placeholderTextColor="#aaa" />

      {/* Описание */}
      <Text style={styles.label}>Описание магазина</Text>
      <TextInput style={[styles.input, { height: 80 }]} placeholder="Расскажите о вашем магазине..." value={storeDescription} onChangeText={setStoreDescription} multiline placeholderTextColor="#aaa" />

      {/* ВЫБОР НИШИ — главный блок */}
      <View style={{ backgroundColor: '#FFF0EB', borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FF4500' }}>
        <Text style={{ fontWeight: 'bold', color: '#FF4500', fontSize: 15, marginBottom: 4 }}>🎯 Выберите вашу нишу *</Text>
        <Text style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>Выбор нельзя изменить после регистрации</Text>
        {BUSINESS_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setStoreCategory(cat.id)}
            style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 8, backgroundColor: storeCategory === cat.id ? '#FF4500' : '#fff', borderWidth: 2, borderColor: storeCategory === cat.id ? '#FF4500' : '#eee' }}
          >
            <Text style={{ fontSize: 28, marginRight: 12 }}>{cat.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 15, color: storeCategory === cat.id ? '#fff' : '#222' }}>{cat.label}</Text>
              <Text style={{ fontSize: 12, color: storeCategory === cat.id ? 'rgba(255,255,255,0.8)' : '#999' }}>{cat.desc}</Text>
            </View>
            {storeCategory === cat.id && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Телефон */}
      <Text style={styles.label}>Телефон магазина *</Text>
      <TextInput style={styles.input} placeholder="+7 777 123 45 67" value={storePhone} onChangeText={setStorePhone} keyboardType="phone-pad" placeholderTextColor="#aaa" />

      {/* Город */}
      <Text style={styles.label}>Город *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        {CITIES.map(c => (
          <TouchableOpacity key={c} onPress={() => setSelectedCity(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: selectedCity === c ? '#FF4500' : '#f0f0f0' }}>
            <Text style={{ color: selectedCity === c ? '#fff' : '#333', fontWeight: '600' }}>{c}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Улица</Text>
      <TextInput style={styles.input} placeholder="ул. Абая" value={street} onChangeText={setStreet} placeholderTextColor="#aaa" />

      <Text style={styles.label}>Дом / Номер</Text>
      <TextInput style={styles.input} placeholder="45" value={house} onChangeText={setHouse} placeholderTextColor="#aaa" />

      {fullAddress.length > 0 && (
        <View style={{ backgroundColor: '#E8F5E9', borderRadius: 10, padding: 10, marginBottom: 14 }}>
          <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>📍 {fullAddress}</Text>
          <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>Ваш магазин появится на карте</Text>
        </View>
      )}
    </View>
  );
}
