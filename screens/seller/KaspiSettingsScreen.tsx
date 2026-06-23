import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from 'firebase/auth';
import { styles } from '../../components/styles';

export function KaspiSettingsScreen({ user }: { user: User }) {
  const [kaspiPhone, setKaspiPhone] = useState('');
  const [kaspiName, setKaspiName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'users', user.uid)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setKaspiPhone(data.kaspiPhone || '');
        setKaspiName(data.kaspiName || '');
      }
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!kaspiPhone || !kaspiName) return Alert.alert('Ошибка', 'Заполни все поля');
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { kaspiPhone, kaspiName });
      Alert.alert('✅ Сохранено!', 'Покупатели увидят ваши реквизиты при оплате');
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setSaving(false);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#FF4500" /></View>;

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5', padding: 20 }}>
      <View style={{ backgroundColor: '#FFF9E6', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#FFD700' }}>
        <Text style={{ fontWeight: 'bold', color: '#333', fontSize: 15, marginBottom: 4 }}>💳 Реквизиты для Kaspi перевода</Text>
        <Text style={{ color: '#666', fontSize: 13 }}>Покупатели будут переводить оплату на этот номер</Text>
      </View>

      <Text style={styles.label}>Номер Kaspi (телефон) *</Text>
      <TextInput style={styles.input} placeholder="+7 777 123 45 67" value={kaspiPhone} onChangeText={setKaspiPhone} keyboardType="phone-pad" placeholderTextColor="#aaa" />

      <Text style={styles.label}>Имя получателя (как в Kaspi) *</Text>
      <TextInput style={styles.input} placeholder="Иван И." value={kaspiName} onChangeText={setKaspiName} placeholderTextColor="#aaa" />

      {kaspiPhone && kaspiName && (
        <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <Text style={{ fontWeight: 'bold', color: '#4CAF50', marginBottom: 6 }}>👁 Покупатель увидит:</Text>
          <Text style={{ color: '#333' }}>📱 Номер: {kaspiPhone}</Text>
          <Text style={{ color: '#333' }}>👤 Получатель: {kaspiName}</Text>
        </View>
      )}

      {saving
        ? <ActivityIndicator color="#FF4500" />
        : <TouchableOpacity style={styles.bigBtn} onPress={save}>
            <Text style={styles.bigBtnText}>💾 Сохранить реквизиты</Text>
          </TouchableOpacity>
      }
    </View>
  );
}
