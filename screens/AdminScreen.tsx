import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { callFn } from '../utils/functions';
import { AdminScreen as AdminMain } from './AdminMain';
import { AdminVerification } from './AdminVerification';

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'main' | 'badges'>('main');
  const [pending, setPending] = useState({ a: 0, s: 0 });
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'badgeApplications'), s => setPending(p => ({ ...p, a: s.docs.filter(d => d.data().status === 'pending').length })));
    const u2 = onSnapshot(collection(db, 'badgeSubscriptions'), s => setPending(p => ({ ...p, s: s.docs.filter(d => d.data().status === 'pending').length })));
    return () => { u1(); u2(); };
  }, []);

  const syncProfiles = async () => {
    setSyncing(true);
    try {
      const r = await callFn<{ count: number }>('backfillPublicProfiles');
      Alert.alert('✅ Готово', `Публичных профилей обновлено: ${r.count}`);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setSyncing(false);
  };

  if (view === 'badges') return <AdminVerification onBack={() => setView('main')} />;

  const n = pending.a + pending.s;
  return (
    <View style={{ flex: 1 }}>
      <AdminMain onBack={onBack} />
      <TouchableOpacity
        onPress={syncProfiles}
        disabled={syncing}
        activeOpacity={0.9}
        style={{ position: 'absolute', left: 16, bottom: insets.bottom + 20, backgroundColor: '#444', borderRadius: 28, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 8 }}
      >
        {syncing ? <ActivityIndicator color="#fff" /> : <Ionicons name="sync" size={20} color="#fff" />}
        <Text style={{ color: '#fff', fontWeight: '800' }}>Профили</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => setView('badges')}
        activeOpacity={0.9}
        style={{ position: 'absolute', right: 16, bottom: insets.bottom + 20, backgroundColor: '#1D9BF0', borderRadius: 28, paddingHorizontal: 18, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 8 }}
      >
        <Ionicons name="checkmark-circle" size={22} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800' }}>Значки</Text>
        {n > 0 && <View style={{ backgroundColor: '#FF4500', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{n}</Text></View>}
      </TouchableOpacity>
    </View>
  );
}
