import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { User } from 'firebase/auth';
import { PromotionScreen as PromotionServices } from './PromotionServices';
import { VerificationScreen } from './VerificationScreen';

export function PromotionScreen({ user }: { user: User }) {
  const [tab, setTab] = useState<'services' | 'verify'>('services');
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ flexDirection: 'row', gap: 8, padding: 10, backgroundColor: '#fff' }}>
        {([['services', '🚀 Продвижение'], ['verify', '✔ Подтверждение']] as const).map(([id, label]) => (
          <TouchableOpacity
            key={id}
            onPress={() => setTab(id)}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: tab === id ? (id === 'verify' ? '#1D9BF0' : '#FF4500') : '#f0f0f0' }}
          >
            <Text style={{ color: tab === id ? '#fff' : '#555', fontWeight: '700' }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {tab === 'services' ? <PromotionServices user={user} /> : <VerificationScreen user={user} />}
    </View>
  );
}
