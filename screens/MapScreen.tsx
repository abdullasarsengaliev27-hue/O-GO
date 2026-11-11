import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { styles } from '../components/styles';

const CITY_COORDS: Record<string, { lat: number, lng: number }> = {
  'Алматы': { lat: 43.2220, lng: 76.8512 },
  'Астана': { lat: 51.1801, lng: 71.4460 },
  'Шымкент': { lat: 42.3417, lng: 69.5901 },
  'Актау': { lat: 43.6526, lng: 51.1575 },
  'Актобе': { lat: 50.2839, lng: 57.1670 },
  'Атырау': { lat: 47.1167, lng: 51.8833 },
  'Павлодар': { lat: 52.2873, lng: 76.9674 },
  'Караганда': { lat: 49.8028, lng: 73.1028 },
  'Тараз': { lat: 42.9000, lng: 71.3667 },
  'Усть-Каменогорск': { lat: 49.9787, lng: 82.6143 },
};

const ALL_CITIES = ['Мой город', 'Все', 'Алматы', 'Астана', 'Шымкент', 'Актау', 'Актобе', 'Атырау', 'Павлодар', 'Караганда'];

type CatKey = 'all' | 'food' | 'tech' | 'clothing' | 'shoes' | 'beauty';
const MAP_CATS: { key: CatKey; name: string }[] = [
  { key: 'all', name: 'Все' },
  { key: 'food', name: '🍕 Еда' },
  { key: 'tech', name: '📱 Техника' },
  { key: 'clothing', name: '👕 Одежда' },
  { key: 'shoes', name: '👟 Обувь' },
  { key: 'beauty', name: '💄 Косметика' },
];

const matchCategory = (deal: any, key: CatKey): boolean => {
  if (key === 'all') return true;
  const c = String(deal.category || '').toLowerCase();
  const isShoes = c.includes('обув') || (c === 'clothing' && deal.clothingType === 'shoes');
  const isClothing = (c === 'clothing' && deal.clothingType !== 'shoes') || c.includes('одежд');
  switch (key) {
    case 'food': return c === 'food' || c.includes('еда');
    case 'tech': return c === 'tech' || c.includes('техник');
    case 'beauty': return c === 'beauty' || c.includes('космет');
    case 'shoes': return isShoes;
    case 'clothing': return isClothing && !isShoes;
    default: return true;
  }
};

const norm = (s?: string | null) => (s || '').trim().toLowerCase();

const hashOffset = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  const a = ((h & 0xffff) / 0xffff) - 0.5;
  const b = (((h >> 16) & 0xffff) / 0xffff) - 0.5;
  return { dLat: a * 0.018, dLng: b * 0.018 };
};

export function MapScreen({ user, userCity }: { user: User | null, userCity?: string | null }) {
  const insets = useSafeAreaInsets();
  const [location, setLocation] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CatKey>('all');
  const [selectedMapCity, setSelectedMapCity] = useState('Мой город');
  const [loading, setLoading] = useState(true);
  const [mapPromotions, setMapPromotions] = useState<string[]>([]);
  const [is3D, setIs3D] = useState(true);

  useEffect(() => {
    (async () => {
      const fallback = () => {
        const def = userCity ? (CITY_COORDS[userCity] || CITY_COORDS['Алматы']) : CITY_COORDS['Алматы'];
        setLocation({ latitude: def.lat, longitude: def.lng });
      };
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc.coords);
        } else fallback();
      } catch { fallback(); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'deals'), snap => {
      setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'publicProfiles'), snap => {
      const now = new Date().toISOString();
      setMapPromotions(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((u: any) => u.mapHighlighted && u.mapHighlightedUntil && u.mapHighlightedUntil > now)
          .map((u: any) => u.id)
      );
    });
  }, []);

  const filtered = deals
    .filter((d: any) => !d.isHidden)
    .filter((d: any) => {
      if (selectedMapCity === 'Мой город') return !userCity || norm(d.city) === norm(userCity);
      if (selectedMapCity === 'Все') return true;
      return norm(d.city) === norm(selectedMapCity);
    })
    .filter((d: any) => matchCategory(d, selectedCategory));

  const isMine = selectedMapCity === 'Мой город' || selectedMapCity === 'Все';
  const baseCity = userCity ? (CITY_COORDS[userCity] || CITY_COORDS['Алматы']) : CITY_COORDS['Алматы'];
  const center = isMine ? baseCity : (CITY_COORDS[selectedMapCity] || CITY_COORDS['Алматы']);
  const myLat = location?.latitude || baseCity.lat;
  const myLng = location?.longitude || baseCity.lng;
  const mapLat = isMine ? myLat : center.lat;
  const mapLng = isMine ? myLng : center.lng;

  const sellerGroups: Record<string, any> = {};
  filtered.forEach((deal: any) => {
    const key = deal.sellerId || deal.store;
    if (!sellerGroups[key]) {
      const c = CITY_COORDS[deal.city] || CITY_COORDS['Алматы'];
      const off = hashOffset(String(key));
      sellerGroups[key] = {
        storeName: deal.store,
        city: deal.city,
        lat: deal.lat || (c.lat + off.dLat),
        lng: deal.lng || (c.lng + off.dLng),
        deals: [],
        isHighlighted: mapPromotions.includes(key),
      };
    }
    sellerGroups[key].deals.push({
      title: deal.title,
      discount: deal.discount,
      newPrice: deal.newPrice,
      oldPrice: deal.oldPrice,
      imageUrl: deal.imageUrl || null,
    });
  });

  const markersJson = JSON.stringify(Object.values(sellerGroups)).replace(/</g, '\\u003c');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css"/>
  <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { position: absolute; inset: 0; }
    .maplibregl-ctrl-attrib { display: none !important; }
    .cm { background: #FF4500; color: white; border: 2px solid white; border-radius: 20px; padding: 3px 8px; font-weight: bold; font-size: 12px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer; }
    .maplibregl-popup-content { border-radius: 14px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.2) !important; padding: 4px !important; }
    .maplibregl-popup-close-button { font-size: 20px; color: #fff; padding: 2px 8px; z-index: 5; }
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(255,215,0,0.7); }
      70% { box-shadow: 0 0 0 15px rgba(255,215,0,0); }
      100% { box-shadow: 0 0 0 0 rgba(255,215,0,0); }
    }
    #err { display:none; position:absolute; top:50%; left:0; right:0; text-align:center; font-family:sans-serif; color:#999; padding:20px; }
  </style>
</head>
<body>
<div id="map"></div>
<div id="err">Не удалось загрузить 3D-карту.<br>Проверь интернет.</div>
<script>
  if (typeof maplibregl === 'undefined') {
    document.getElementById('err').style.display = 'block';
  } else {
    var map = new maplibregl.Map({
      container: 'map',
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [${mapLng}, ${mapLat}],
      zoom: 15.2,
      pitch: ${is3D ? 60 : 0},
      bearing: ${is3D ? -17 : 0},
      maxPitch: 75,
      attributionControl: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    // Моя позиция
    var me = document.createElement('div');
    me.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#4285F4;border:3px solid #fff;box-shadow:0 0 0 6px rgba(66,133,244,0.25)';
    new maplibregl.Marker({ element: me })
      .setLngLat([${myLng}, ${myLat}])
      .setPopup(new maplibregl.Popup({ offset: 14 }).setHTML('<b style="padding:6px;display:block">📍 Вы здесь</b>'))
      .addTo(map);

    var allMarkers = ${markersJson};

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
        return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
      });
    }

    allMarkers.forEach(function(m) {
      var dealCount = m.deals.length;
      var el = document.createElement('div');

      if (m.isHighlighted) {
        el.innerHTML = '<div style="background:linear-gradient(135deg,#FFD700,#FFA500);color:#fff;border:3px solid #fff;border-radius:50%;width:60px;height:60px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 0 20px rgba(255,215,0,0.8),0 4px 15px rgba(0,0,0,0.3);animation:pulse 2s infinite"><span style="font-size:18px">⭐</span><span style="font-size:9px;font-weight:900">ТОП</span></div>';
      } else if (dealCount === 1) {
        el.innerHTML = '<div class="cm">-' + esc(m.deals[0].discount) + '%</div>';
      } else {
        el.innerHTML = '<div class="cm" style="border-radius:50%;width:48px;height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0"><span style="font-size:16px;font-weight:900">' + dealCount + '</span><span style="font-size:9px;opacity:0.9">скидок</span></div>';
      }

      var dealsHtml = m.deals.slice(0, 5).map(function(d) {
        var imgHtml = d.imageUrl
          ? '<img src="' + esc(d.imageUrl) + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0" />'
          : '<div style="width:48px;height:48px;border-radius:8px;background:#FFF0EB;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🏷</div>';
        return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5">' +
          imgHtml +
          '<div style="flex:1;min-width:0">' +
            '<div style="font-weight:700;font-size:13px;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(d.title) + '</div>' +
            '<div style="display:flex;align-items:center;gap:6px;margin-top:3px">' +
              '<span style="color:#FF4500;font-weight:800;font-size:14px">' + Number(d.newPrice).toLocaleString() + ' \\u20B8</span>' +
              (d.oldPrice ? '<span style="color:#aaa;font-size:11px;text-decoration:line-through">' + Number(d.oldPrice).toLocaleString() + ' \\u20B8</span>' : '') +
              '<span style="background:#FF4500;color:#fff;border-radius:6px;padding:2px 6px;font-size:11px;font-weight:800">-' + esc(d.discount) + '%</span>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      var moreHtml = m.deals.length > 5
        ? '<div style="text-align:center;padding:8px;color:#FF4500;font-size:12px;font-weight:700">+ ещё ' + (m.deals.length - 5) + ' скидок</div>'
        : '';

      var minD = Math.min.apply(null, m.deals.map(function(d) { return d.discount; }));
      var maxD = Math.max.apply(null, m.deals.map(function(d) { return d.discount; }));
      var range = minD === maxD ? '-' + minD + '%' : '-' + minD + '% до -' + maxD + '%';

      var popupHtml =
        '<div style="width:250px;font-family:-apple-system,Roboto,sans-serif">' +
          '<div style="background:linear-gradient(135deg,#FF4500,#FF6B35);padding:12px 14px;margin:-4px -4px 0;border-radius:10px 10px 0 0">' +
            '<div style="color:#fff;font-weight:800;font-size:15px;padding-right:18px">🏪 ' + esc(m.storeName) + '</div>' +
            '<div style="color:rgba(255,255,255,0.85);font-size:11px;margin-top:3px">📍 ' + esc(m.city) + ' · ' + dealCount + ' скидок · ⚡ ' + range + '</div>' +
          '</div>' +
          '<div style="padding:4px 10px">' + dealsHtml + '</div>' +
          moreHtml +
        '</div>';

      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([m.lng, m.lat])
        .setPopup(new maplibregl.Popup({ offset: 24, maxWidth: '280px' }).setHTML(popupHtml))
        .addTo(map);
    });
  }
</script>
</body>
</html>`;

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#FF4500" />
      <Text style={{ color: '#999', marginTop: 12 }}>Определяем местоположение...</Text>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Выбор города */}
      <View style={{ backgroundColor: '#FF4500', paddingTop: insets.top + 8, paddingBottom: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {ALL_CITIES.map(city => (
            <TouchableOpacity
              key={city}
              onPress={() => setSelectedMapCity(city)}
              style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginRight: 8, backgroundColor: selectedMapCity === city ? '#fff' : 'rgba(255,255,255,0.25)' }}
            >
              <Text style={{ color: selectedMapCity === city ? '#FF4500' : '#fff', fontWeight: '600', fontSize: 13 }}>
                {city === 'Мой город' ? '📍 Мой город' : city === 'Все' ? '🌍 Все' : city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Фильтр категорий */}
      <View style={{ backgroundColor: '#fff', elevation: 2 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}>
          {MAP_CATS.map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8, backgroundColor: selectedCategory === cat.key ? '#FF4500' : '#f0f0f0' }}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Text style={{ color: selectedCategory === cat.key ? '#fff' : '#333', fontWeight: '600', fontSize: 13 }}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <WebView
        key={selectedMapCity + selectedCategory + filtered.length + (is3D ? '3d' : '2d')}
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
        nestedScrollEnabled
      />

      {/* Переключатель 2D / 3D */}
      <TouchableOpacity
        onPress={() => setIs3D(v => !v)}
        activeOpacity={0.85}
        style={{ position: 'absolute', top: insets.top + 110, left: 12, backgroundColor: is3D ? '#FF4500' : '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 9, elevation: 5, flexDirection: 'row', alignItems: 'center', gap: 6 }}
      >
        <Ionicons name="cube-outline" size={18} color={is3D ? '#fff' : '#FF4500'} />
        <Text style={{ color: is3D ? '#fff' : '#FF4500', fontWeight: '800', fontSize: 14 }}>{is3D ? '3D' : '2D'}</Text>
      </TouchableOpacity>

      <View style={{ position: 'absolute', bottom: 20, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, elevation: 4, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="location" size={18} color="#FF4500" />
        <Text style={{ color: '#333', fontWeight: '600' }}>
          <Text style={{ color: '#FF4500' }}>{filtered.length}</Text>
          {' скидок · '}{selectedMapCity === 'Мой город' ? (userCity || 'Мой город') : selectedMapCity}
        </Text>
      </View>
    </View>
  );
}
