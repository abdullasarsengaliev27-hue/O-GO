import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, AsyncStorage } from 'react-native';
import AsyncStorageLib from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const CITIES = [
  { name: 'Алматы', emoji: '🌆' },
  { name: 'Астана', emoji: '🏛' },
  { name: 'Шымкент', emoji: '🌿' },
  { name: 'Актау', emoji: '🌊' },
  { name: 'Актобе', emoji: '⭐' },
  { name: 'Атырау', emoji: '🛢' },
  { name: 'Павлодар', emoji: '🏭' },
  { name: 'Караганда', emoji: '⛏' },
  { name: 'Тараз', emoji: '🏺' },
  { name: 'Усть-Каменогорск', emoji: '🏔' },
];

export function CitySelectScreen({ onSelect }: { onSelect: (city: string) => void }) {
  const [selected, setSelected] = useState('');

  const handleSelect = async (city: string) => {
    setSelected(city);
    await AsyncStorageLib.setItem('userCity', city);
    setTimeout(() => onSelect(city), 300);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FF4500' }}>
      {/* Шапка */}
      <View style={{ paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#fff', letterSpacing: 4, marginBottom: 8 }}>O-GO</Text>
        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>
          Добро пожаловать! 👋
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, textAlign: 'center' }}>
          В каком городе вы находитесь?
        </Text>
      </View>

      {/* Список городов */}
      <ScrollView
        style={{ flex: 1, backgroundColor: '#f5f5f5', borderTopLeftRadius: 28, borderTopRightRadius: 28 }}
        contentContainerStyle={{ padding: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: '#999', fontSize: 14, marginBottom: 16, textAlign: 'center' }}>
          Выберите ваш город — покажем скидки только рядом с вами
        </Text>
        {CITIES.map(city => (
          <TouchableOpacity
            key={city.name}
            onPress={() => handleSelect(city.name)}
            style={{
              flexDirection: 'row', alignItems: 'center',
              backgroundColor: selected === city.name ? '#FF4500' : '#fff',
              borderRadius: 16, padding: 16, marginBottom: 10,
              elevation: 2, borderWidth: 2,
              borderColor: selected === city.name ? '#FF4500' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 28, marginRight: 14 }}>{city.emoji}</Text>
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '600', color: selected === city.name ? '#fff' : '#222' }}>
              {city.name}
            </Text>
            {selected === city.name && <Ionicons name="checkmark-circle" size={24} color="#fff" />}
          </TouchableOpacity>
        ))}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
