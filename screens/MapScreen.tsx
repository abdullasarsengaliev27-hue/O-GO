import { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { CATEGORIES } from '../components/constants';
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

export function MapScreen({ user, userCity }: { user: User | null, userCity?: string | null }) {
  const [location, setLocation] = useState<any>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [selectedMapCity, setSelectedMapCity] = useState('Мой город');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc.coords);
      } else {
        const def = userCity ? (CITY_COORDS[userCity] || CITY_COORDS['Алматы']) : CITY_COORDS['Алматы'];
        setLocation({ latitude: def.lat, longitude: def.lng });
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'deals'), snap => {
      setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const filtered = deals
    .filter((d: any) => !d.isHidden)
    .filter((d: any) => {
      if (selectedMapCity === 'Мой город') return !userCity || d.city === userCity;
      if (selectedMapCity === 'Все') return true;
      return d.city === selectedMapCity;
    })
    .filter((d: any) => selectedCategory === 'Все' || d.category === selectedCategory);

  const getCenter = () => {
    if (selectedMapCity === 'Мой город' || selectedMapCity === 'Все') {
      return userCity ? (CITY_COORDS[userCity] || CITY_COORDS['Алматы']) : CITY_COORDS['Алматы'];
    }
    return CITY_COORDS[selectedMapCity] || CITY_COORDS['Алматы'];
  };

  const center = getCenter();
  const centerLat = location?.latitude || center.lat;
  const centerLng = location?.longitude || center.lng;
  const mapLat = selectedMapCity === 'Мой город' || selectedMapCity === 'Все' ? centerLat : center.lat;
  const mapLng = selectedMapCity === 'Мой город' || selectedMapCity === 'Все' ? centerLng : center.lng;

 // Группируем скидки по продавцу
const sellerGroups: Record<string, any> = {};
deals
  .filter((d: any) => !d.isHidden)
  .filter((d: any) => selectedCategory === 'Все' || d.category === selectedCategory)
  .forEach((deal: any) => {
    const key = deal.sellerId || deal.store;
    if (!sellerGroups[key]) {
      const c = CITY_COORDS[deal.city] || CITY_COORDS['Алматы'];
      sellerGroups[key] = {
        storeName: deal.store,
        city: deal.city,
        lat: deal.lat || (c.lat + (Math.random() - 0.5) * 0.018),
        lng: deal.lng || (c.lng + (Math.random() - 0.5) * 0.018),
        deals: [],
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

const allMarkers = Object.values(sellerGroups);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
    .cm { background: #FF4500; color: white; border: 2px solid white; border-radius: 20px; padding: 3px 8px; font-weight: bold; font-size: 12px; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer; }
    .cm:hover { background: #cc3300; }
    .pt { font-weight: bold; font-size: 14px; margin-bottom: 3px; }
    .pp { color: #FF4500; font-weight: bold; font-size: 15px; }
    .ps { color: #666; font-size: 12px; }
    .pc { color: #999; font-size: 11px; }
    .pb { background: #FF4500; color: white; border-radius: 6px; padding: 1px 5px; font-size: 11px; }
    .leaflet-control-attribution { display: none !important; }
.leaflet-control-zoom { border: none !important; border-radius: 12px !important; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; }
.leaflet-control-zoom a { background: #fff !important; color: #FF4500 !important; font-weight: bold !important; border: none !important; }
.leaflet-control-zoom a:hover { background: #FFF0EB !important; }
.leaflet-popup-content-wrapper { border-radius: 14px !important; box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important; border: none !important; padding: 4px !important; }
.leaflet-popup-tip { background: #fff !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map').setView([${mapLat}, ${mapLng}], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: ''
  }).addTo(map);

// Убираем логотип Leaflet
document.querySelector('.leaflet-control-attribution').style.display = 'none';

  // Моя позиция
  L.circleMarker([${centerLat}, ${centerLng}], {
    radius: 10, fillColor: '#4285F4', color: '#fff', weight: 3, fillOpacity: 1
  }).addTo(map).bindPopup('<b>📍 Вы здесь</b>');

  // Все маркеры всех городов
  var allMarkers = ${JSON.stringify(allMarkers)};
  var markerObjects = [];

  allMarkers.forEach(function(m) {
    var dealCount = m.deals.length;
    var icon;

    if (dealCount === 1) {
      icon = L.divIcon({
        className: '',
        html: '<div class="cm">-' + m.deals[0].discount + '%</div>',
        iconAnchor: [20, 10]
      });
    } else {
      icon = L.divIcon({
        className: '',
        html: '<div class="cm" style="border-radius:50%;width:48px;height:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0"><span style="font-size:16px;font-weight:900">' + dealCount + '</span><span style="font-size:9px;opacity:0.9">скидок</span></div>',
        iconAnchor: [24, 24]
      });
    }

    // Попап со списком скидок и фото
    var dealsHtml = m.deals.slice(0, 5).map(function(d) {
      var imgHtml = d.imageUrl
        ? '<img src="' + d.imageUrl + '" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0" />'
        : '<div style="width:48px;height:48px;border-radius:8px;background:#FFF0EB;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🏷</div>';

      return '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f5f5f5">' +
        imgHtml +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-weight:700;font-size:13px;color:#1a1a1a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + d.title + '</div>' +
          '<div style="display:flex;align-items:center;gap:6px;margin-top:3px">' +
            '<span style="color:#FF4500;font-weight:800;font-size:14px">' + Number(d.newPrice).toLocaleString() + ' \u20B8</span>' +
            (d.oldPrice ? '<span style="color:#aaa;font-size:11px;text-decoration:line-through">' + Number(d.oldPrice).toLocaleString() + ' \u20B8</span>' : '') +
            '<span style="background:#FF4500;color:#fff;border-radius:6px;padding:2px 6px;font-size:11px;font-weight:800">-' + d.discount + '%</span>' +
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

    var popup =
      '<div style="background:linear-gradient(135deg,#FF4500,#FF6B35);padding:12px 14px;margin:-4px -4px 0;border-radius:10px 10px 0 0">' +
        '<div style="color:#fff;font-weight:800;font-size:15px">🏪 ' + m.storeName + '</div>' +
        '<div style="color:rgba(255,255,255,0.85);font-size:11px;margin-top:3px">📍 ' + m.city + ' &nbsp;·&nbsp; ' + dealCount + ' скидок &nbsp;·&nbsp; ⚡ ' + range + '</div>' +
      '</div>' +
      '<div style="padding:4px 14px">' + dealsHtml + '</div>' +
      moreHtml;

    L.marker([m.lat, m.lng], { icon: icon })
      .addTo(map)
      .bindPopup(popup, { maxWidth: 280, minWidth: 260 });
  });

  // Фильтрация по видимой области — показываем все маркеры всегда
  // Маркеры уже в правильных городах
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
      <View style={{ backgroundColor: '#FF4500', paddingVertical: 8 }}>
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
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8, backgroundColor: selectedCategory === cat ? '#FF4500' : '#f0f0f0' }}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={{ color: selectedCategory === cat ? '#fff' : '#333', fontWeight: '600', fontSize: 13 }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <WebView
        key={selectedMapCity + selectedCategory}
        source={{ html }}
        style={{ flex: 1 }}
        javaScriptEnabled
        originWhitelist={['*']}
      />

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
