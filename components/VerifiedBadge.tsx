import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { isBadgeActive } from '../utils/verification';

export function VerifiedBadge({ size = 16, label = false }: { size?: number; label?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name="checkmark-circle" size={size} color="#1D9BF0" />
      {label && <Text style={{ color: '#1D9BF0', fontWeight: '700', fontSize: size * 0.75 }}>Подтверждённый бизнес</Text>}
    </View>
  );
}

const cache = new Map<string, { v: boolean; t: number }>();

// Для карточек: true, если у продавца сейчас активный значок
export function useSellerVerified(sellerId?: string) {
  const [verified, setVerified] = useState(false);
  useEffect(() => {
    if (!sellerId) return;
    const hit = cache.get(sellerId);
    if (hit && Date.now() - hit.t < 60000) { setVerified(hit.v); return; }
    let alive = true;
    getDoc(doc(db, 'users', sellerId)).then(s => {
      const v = s.exists() ? isBadgeActive(s.data()) : false;
      cache.set(sellerId, { v, t: Date.now() });
      if (alive) setVerified(v);
    }).catch(() => {});
    return () => { alive = false; };
  }, [sellerId]);
  return verified;
}
