import { useState, useEffect } from 'react';
import { View, TextInput, FlatList, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';
import { styles } from '../components/styles';

export function SearchScreen({ user, userCity }: { user: User | null, userCity?: string | null }) {  const [query, setQuery] = useState('');
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => {
    return onSnapshot(collection(db, 'deals'), snap =>
      setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const filtered = deals
  .filter(d => !d.isHidden)
  .filter(d => !userCity || d.city === userCity)
  .filter(d => d.title?.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color="#999" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Найти скидку..."
          value={query}
          onChangeText={setQuery}
          placeholderTextColor="#aaa"
        />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <DealCard item={item} user={user} />}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', color: '#aaa', marginTop: 40 }}>
            Ничего не найдено
          </Text>
        }
      />
    </View>
  );
}
