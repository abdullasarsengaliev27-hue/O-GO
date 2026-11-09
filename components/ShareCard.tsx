import { View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const SHARE_CARD_WIDTH = 340;

export function ShareCard({ item }: { item: any }) {
  const saved = Number(item.oldPrice) - Number(item.newPrice);

  return (
    <View
      collapsable={false}
      style={{ width: SHARE_CARD_WIDTH, backgroundColor: '#FF4500', borderRadius: 28, padding: 12 }}
    >
      {/* Шапка */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, paddingTop: 4, paddingBottom: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={require('../assets/icon.png')} style={{ width: 34, height: 34, borderRadius: 10 }} />
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>O-GO</Text>
        </View>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="flash" size={14} color="#FF4500" />
          <Text style={{ color: '#FF4500', fontWeight: '900', fontSize: 16 }}>-{item.discount}%</Text>
        </View>
      </View>

      {/* Белая карточка */}
      <View style={{ backgroundColor: '#fff', borderRadius: 22, overflow: 'hidden' }}>
        <View style={{ width: '100%', height: 260, backgroundColor: '#f3f3f3' }}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="pricetag" size={64} color="#ddd" />
            </View>
          )}
        </View>

        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#1a1a1a', lineHeight: 25 }} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 10 }}>
            <Text style={{ fontSize: 32, fontWeight: '900', color: '#FF4500' }}>
              {Number(item.newPrice).toLocaleString()} ₸
            </Text>
            <Text style={{ fontSize: 16, color: '#aaa', textDecorationLine: 'line-through', marginBottom: 4 }}>
              {Number(item.oldPrice).toLocaleString()} ₸
            </Text>
          </View>

          {saved > 0 && (
            <View style={{ alignSelf: 'flex-start', backgroundColor: '#E8F5E9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginTop: 8 }}>
              <Text style={{ color: '#16A34A', fontWeight: '800', fontSize: 13 }}>
                💰 Экономия {saved.toLocaleString()} ₸
              </Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 }} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="storefront" size={16} color="#FF4500" />
            <Text style={{ color: '#1a1a1a', fontWeight: '700', fontSize: 14, flex: 1 }} numberOfLines={1}>{item.store}</Text>
          </View>
          {item.city ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Ionicons name="location" size={16} color="#999" />
              <Text style={{ color: '#888', fontSize: 13 }} numberOfLines={1}>
                {item.city}{item.exactAddress ? `, ${String(item.exactAddress).split(',').slice(0, 2).join(',')}` : ''}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Подвал */}
      <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Все скидки Казахстана в одном месте</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 }}>Скачай приложение O-GO 🔥</Text>
      </View>
    </View>
  );
}
