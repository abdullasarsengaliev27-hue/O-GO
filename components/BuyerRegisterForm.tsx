import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';

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

export function BuyerRegisterForm({
  buyerName, setBuyerName,
  buyerPhone, setBuyerPhone,
  buyerCity, setBuyerCity,
  agreedToPolicy, setAgreedToPolicy,
}: {
  buyerName: string; setBuyerName: (v: string) => void;
  buyerPhone: string; setBuyerPhone: (v: string) => void;
  buyerCity: string; setBuyerCity: (v: string) => void;
  agreedToPolicy: boolean; setAgreedToPolicy: (v: boolean) => void;
}) {
  const [nameError, setNameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [showPolicy, setShowPolicy] = useState(false);

  return (
    <View>
      {/* Имя и Фамилия */}
      <Text style={styles.label}>Имя и Фамилия *</Text>
      <View style={{ marginBottom: 12 }}>
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
        {nameError
          ? <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{nameError}</Text>
          : <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4, marginLeft: 4 }}>Только буквы, минимум два слова</Text>
        }
      </View>

      {/* Телефон */}
      <Text style={[styles.label, { marginTop: 4 }]}>Номер телефона *</Text>
      <View style={{ marginBottom: 12 }}>
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
        {phoneError && <Text style={{ color: '#EF4444', fontSize: 12, marginTop: 4, marginLeft: 4 }}>{phoneError}</Text>}
      </View>

      {/* Город */}
      <Text style={[styles.label, { marginTop: 4 }]}>Город *</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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

      {/* Согласие с политикой */}
      <TouchableOpacity
        onPress={() => setAgreedToPolicy(!agreedToPolicy)}
        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: agreedToPolicy ? '#F0FFF4' : '#f8f8f8', borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: agreedToPolicy ? '#22C55E' : '#f0f0f0', marginBottom: 8 }}
      >
        <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: agreedToPolicy ? '#22C55E' : '#fff', borderWidth: 2, borderColor: agreedToPolicy ? '#22C55E' : '#ddd', justifyContent: 'center', alignItems: 'center', marginTop: 1 }}>
          {agreedToPolicy && <Ionicons name="checkmark" size={14} color="#fff" />}
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

      {!agreedToPolicy && (
        <Text style={{ color: '#aaa', fontSize: 11, marginLeft: 4, marginBottom: 8 }}>
          Необходимо принять условия для регистрации
        </Text>
      )}

      {/* Модал политики */}
      <Modal visible={showPolicy} animationType="slide" onRequestClose={() => setShowPolicy(false)}>
        <PrivacyPolicyScreen onClose={() => setShowPolicy(false)} />
      </Modal>
    </View>
  );
}
