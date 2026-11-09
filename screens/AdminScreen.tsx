import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { AdminScreen as AdminMain } from './AdminMain';
import { AdminVerification } from './AdminVerification';

export function AdminScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'main' | 'badges'>('main');
  const [pending, setPending] = useState({ a: 0, s: 0 });

  useEffect(() => {
    const u1 = onSnapshot(collection(db, 'badgeApplications'), s => setPending(p => ({ ...p, a: s.docs.filter(d => d.data().status === 'pending').length })));
    const u2 = onSnapshot(collection(db, 'badgeSubscriptions'), s => setPending(p => ({ ...p, s: s.docs.filter(d => d.data().status === 'pending').length })));
    return () => { u1(); u2(); };
  }, []);

  if (view === 'badges') return <AdminVerification onBack={() => setView('main')} />;

  const n = pending.a + pending.s;
  return (
    <View style={{ flex: 1 }}>
      <AdminMain onBack={onBack} />
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
