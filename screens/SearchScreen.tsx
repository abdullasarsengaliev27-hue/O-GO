import { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';

const norm = (s?: string | null) => (s || '').trim().toLowerCase();

export function SearchScreen({ user, userCity }: { user: User | null, userCity?: string | null }) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, 'deals'), snap =>
      setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const q = norm(query);

  const filtered = deals
    .filter(d => !d.isHidden)
    .filter(d => !userCity || userCity === 'Все' || norm(d.city) === norm(userCity))
    .filter(d =>
      q === '' ||
      norm(d.title).includes(q) ||
      norm(d.store).includes(q) ||
      norm(d.description).includes(q)
    );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: insets.top + 10, paddingBottom: 14, paddingHorizontal: 16 }}>
        <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 10 }}>🔍 Поиск</Text>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="search" size={20} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#1a1a1a' }}
            placeholder="Найти скидку, магазин..."
            value={query}
            onChangeText={setQuery}
            placeholderTextColor="#aaa"
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={20} color="#aaa" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <DealCard item={item} user={user} />}
        contentContainerStyle={{ padding: 12, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <Text style={{ color: '#999', fontSize: 13, marginBottom: 8 }}>
            Найдено: <Text style={{ color: '#FF4500', fontWeight: 'bold' }}>{filtered.length}</Text> скидок
          </Text>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60, paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>😔</Text>
            <Text style={{ textAlign: 'center', color: '#aaa', fontSize: 16 }}>
              {query ? `Ничего не найдено по «${query}»` : 'Скидок пока нет'}
            </Text>
          </View>
        }
      />
    </View>
  );
}
