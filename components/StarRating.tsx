import { View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export function StarRating({ rating, onRate, size = 24 }: { rating: number, onRate?: (r: number) => void, size?: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onRate?.(star)} disabled={!onRate}>
          <Ionicons name={star <= rating ? 'star' : 'star-outline'} size={size} color="#FF4500" />
        </TouchableOpacity>
      ))}
    </View>
  );
}
