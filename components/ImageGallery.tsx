import { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Полноэкранная галерея со свайпом влево/вправо
export function ImageGallery({ visible, images, title, onClose }: {
  visible: boolean;
  images: string[];
  title?: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.96)', justifyContent: 'center' }}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {images.map((uri, i) => (
            <View key={i} style={{ width, height, justifyContent: 'center', alignItems: 'center' }}>
              <Image source={{ uri }} style={{ width, height: height * 0.72 }} resizeMode="contain" />
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ position: 'absolute', top: insets.top + 10, right: 16, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View pointerEvents="none" style={{ position: 'absolute', top: insets.top + 16, left: 16, right: 70 }}>
          {title ? <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }} numberOfLines={1}>{title}</Text> : null}
          {images.length > 1 && (
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 }}>{index + 1} / {images.length}</Text>
          )}
        </View>

        {images.length > 1 && (
          <View pointerEvents="none" style={{ position: 'absolute', bottom: insets.bottom + 30, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
            {images.map((_, i) => (
              <View key={i} style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === index ? '#FF4500' : 'rgba(255,255,255,0.4)' }} />
            ))}
          </View>
        )}
      </View>
    </Modal>
  );
}
