import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';

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

const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Актау', 'Актобе', 'Атырау', 'Павлодар', 'Караганда'];

export function BuyerRegisterForm({ buyerName, setBuyerName, buyerPhone, setBuyerPhone, buyerCity, setBuyerCity }: {
  buyerName: string; setBuyerName: (v: string) => void;
  buyerPhone: string; setBuyerPhone: (v: string) => void;
  buyerCity: string; setBuyerCity: (v: string) => void;
}) {
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');

  return (
    <View>
      {/* Имя и Фамилия */}
      <Text style={styles.label}>Имя и Фамилия *</Text>
      <View style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: nameError ? '#EF4444' : buyerName && !nameError ? '#22C55E' : '#f0f0f0' }}>
          <Ionicons name="person-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' }}
            placeholder="Иван Иванов"
            value={buyerName}
            onChangeText={v => { setBuyerName(v); setNameError(''); }}
            onBlur={() => setNameError(validateName(buyerName) || '')}
            placeholderTextColor="#ccc"
          />
          {buyerName && !nameError && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
        </View>
        {nameError ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{nameError}</Text> : null}
        {!nameError && <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4, marginLeft: 4 }}>Только буквы, минимум два слова</Text>}
      </View>

      {/* Телефон */}
      <Text style={[styles.label, { marginTop: 10 }]}>Номер телефона *</Text>
      <View style={{ marginBottom: 4 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: phoneError ? '#EF4444' : buyerPhone && !phoneError ? '#22C55E' : '#f0f0f0' }}>
          <Ionicons name="call-outline" size={18} color="#aaa" style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a1a' }}
            placeholder="+7 777 123 45 67"
            value={buyerPhone}
            onChangeText={v => { setBuyerPhone(v); setPhoneError(''); }}
            onBlur={() => setPhoneError(validatePhone(buyerPhone) || '')}
            keyboardType="phone-pad"
            placeholderTextColor="#ccc"
          />
          {buyerPhone && !phoneError && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
        </View>
        {phoneError ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{phoneError}</Text> : null}
      </View>

      {/* Город */}
      <Text style={[styles.label, { marginTop: 10 }]}>Город *</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {CITIES.map(city => (
          <TouchableOpacity
            key={city}
            onPress={() => setBuyerCity(city)}
            style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: buyerCity === city ? '#FF4500' : '#f0f0f0', borderWidth: 1.5, borderColor: buyerCity === city ? '#FF4500' : 'transparent' }}
          >
            <Text style={{ color: buyerCity === city ? '#fff' : '#555', fontWeight: '600', fontSize: 13 }}>{city}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
