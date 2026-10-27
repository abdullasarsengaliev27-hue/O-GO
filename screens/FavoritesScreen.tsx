import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';

export function FavoritesScreen({ user }: { user: User | null }) {
  const [favs, setFavs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(collection(db, 'users', user.uid, 'favorites'), snap => {
      setFavs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  if (!user) return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
      <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 56 }}>❤️</Text>
      </View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 8, textAlign: 'center' }}>Избранное</Text>
      <Text style={{ color: '#999', textAlign: 'center', fontSize: 15, lineHeight: 22 }}>
        Войдите в аккаунт чтобы сохранять любимые скидки
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {/* Шапка */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: '800', marginBottom: 4 }}>❤️ Избранное</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
          {favs.length > 0 ? `${favs.length} сохранённых скидок` : 'Сохраняй лучшие скидки'}
        </Text>
      </View>

      <FlatList
        data={favs}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <DealCard item={item} user={user} />}
        contentContainerStyle={{ padding: 12, paddingTop: 8, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 }}>
            <View style={{ width: 140, height: 140, borderRadius: 70, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 64 }}>🤍</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '800', color: '#1a1a1a', marginBottom: 12, textAlign: 'center' }}>
              Нет избранных скидок
            </Text>
            <Text style={{ color: '#aaa', textAlign: 'center', fontSize: 15, lineHeight: 22, marginBottom: 24 }}>
              Нажми ❤️ на любой скидке чтобы сохранить её здесь
            </Text>
            <View style={{ backgroundColor: '#FFF0EB', borderRadius: 16, padding: 16, width: '100%' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="heart" size={18} color="#fff" />
                </View>
                <Text style={{ color: '#FF4500', fontWeight: '700', fontSize: 14 }}>Как добавить в избранное?</Text>
              </View>
              <Text style={{ color: '#666', fontSize: 13, lineHeight: 20 }}>
                Открой любую скидку и нажми на иконку ❤️ в правом верхнем углу фото
              </Text>
            </View>
          </View>
        }
      />
    </View>
  );
}
