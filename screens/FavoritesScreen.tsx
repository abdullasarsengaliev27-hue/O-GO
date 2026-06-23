import { useState, useEffect } from 'react';
import { View, Text, FlatList } from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';
import { styles } from '../components/styles';

export function FavoritesScreen({ user }: { user: User | null }) {
  const [favs, setFavs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'users', user.uid, 'favorites'), snap => {
      setFavs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  if (!user) return (
    <View style={styles.center}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>❤️</Text>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 8 }}>Избранное</Text>
      <Text style={{ color: '#999', textAlign: 'center' }}>Войдите в аккаунт чтобы сохранять скидки</Text>
    </View>
  );

  return (
    <FlatList
      data={favs}
      keyExtractor={item => item.id}
      renderItem={({ item }) => <DealCard item={item} user={user} />}
      contentContainerStyle={{ padding: 12, backgroundColor: '#f5f5f5', flexGrow: 1 }}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🤍</Text>
          <Text style={{ fontSize: 16, color: '#aaa', textAlign: 'center' }}>Нет избранных скидок{'\n'}Нажми ❤️ на любой скидке!</Text>
        </View>
      }
    />
  );
}
