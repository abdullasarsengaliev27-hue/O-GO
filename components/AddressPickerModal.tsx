import { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  city?: string;
}

const CITY_COORDS: Record<string, { lat: number, lng: number }> = {
  'Алматы': { lat: 43.2220, lng: 76.8512 },
  'Астана': { lat: 51.1801, lng: 71.4460 },
  'Шымкент': { lat: 42.3417, lng: 69.5901 },
  'Актау': { lat: 43.6526, lng: 51.1575 },
  'Актобе': { lat: 50.2839, lng: 57.1670 },
  'Атырау': { lat: 47.1167, lng: 51.8833 },
  'Павлодар': { lat: 52.2873, lng: 76.9674 },
  'Караганда': { lat: 49.8028, lng: 73.1028 },
};

export function AddressPickerModal({ visible, onClose, onSelect, city }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showMap, setShowMap] = useState(false);
  const debounceRef = useRef<any>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cityCoords = city ? (CITY_COORDS[city] || CITY_COORDS['Алматы']) : CITY_COORDS['Алматы'];

  const searchAddress = (text: string) => {
    setQuery(text);
    setResults([]);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (text.trim().length < 3) return;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        abortRef.current = new AbortController();
        const cityName = city || 'Казахстан';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text + ', ' + cityName)}&format=json&limit=5&countrycodes=kz`;
        
        const response = await fetch(url, {
          signal: abortRef.current.signal,
          headers: { 'User-Agent': 'O-GO App' },
        });
        const data = await response.json();
        setResults(data);
      } catch (e: any) {
        if (e.name !== 'AbortError') setResults([]);
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  const handleSelect = (item: any) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const address = item.display_name.split(',').slice(0, 3).join(',');
    setSelectedLat(lat);
    setSelectedLng(lng);
    setSelectedAddress(address);
    setResults([]);
    setQuery(address);
    setShowMap(true);
  };

  const handleConfirm = () => {
    if (selectedLat && selectedLng && selectedAddress) {
      onSelect(selectedAddress, selectedLat, selectedLng);
      setQuery('');
      setResults([]);
      setShowMap(false);
    }
  };

  const mapLat = selectedLat || cityCoords.lat;
  const mapLng = selectedLng || cityCoords.lng;

  const mapHtml = `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
    .leaflet-control-attribution { display: none; }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = L.map('map').setView([${mapLat}, ${mapLng}], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
  var marker = L.marker([${mapLat}, ${mapLng}], { draggable: true }).addTo(map);
  marker.on('dragend', function(e) {
    var pos = e.target.getLatLng();
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: pos.lat, lng: pos.lng }));
  });
  map.on('click', function(e) {
    marker.setLatLng(e.latlng);
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: e.latlng.lat, lng: e.latlng.lng }));
  });
</script>
</body>
</html>`;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Шапка */}
        <View style={{ backgroundColor: '#FF4500', paddingTop: 54, paddingBottom: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', flex: 1 }}>📍 Адрес магазина</Text>
        </View>

        {/* Поиск */}
        <View style={{ backgroundColor: '#fff', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 14, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#f0f0f0' }}>
            <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, paddingVertical: 12, fontSize: 15, color: '#1a1a1a' }}
              placeholder={`Поиск адреса в ${city || 'Казахстане'}...`}
              value={query}
              onChangeText={searchAddress}
              placeholderTextColor="#ccc"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setResults([]); setShowMap(false); }}>
                <Ionicons name="close-circle" size={20} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
          {loading && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <ActivityIndicator size="small" color="#FF4500" />
              <Text style={{ color: '#999', fontSize: 13 }}>Поиск адреса...</Text>
            </View>
          )}
        </View>

        {/* Результаты поиска */}
        {results.length > 0 && (
          <View style={{ backgroundColor: '#fff', maxHeight: 220, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
            <FlatList
              data={results}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelect(item)}
                  style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5', flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <Ionicons name="location-outline" size={18} color="#FF4500" />
                  <Text style={{ flex: 1, color: '#1a1a1a', fontSize: 14 }} numberOfLines={2}>
                    {item.display_name.split(',').slice(0, 3).join(',')}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* Карта */}
        {showMap ? (
          <>
            <View style={{ backgroundColor: '#FFF0EB', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="information-circle" size={18} color="#FF4500" />
              <Text style={{ color: '#FF4500', fontSize: 13, flex: 1 }}>Перетащи маркер или нажми на карту чтобы уточнить</Text>
            </View>
            <WebView
              source={{ html: mapHtml }}
              style={{ flex: 1 }}
              javaScriptEnabled
              originWhitelist={['*']}
              onMessage={(e) => {
                try {
                  const { lat, lng } = JSON.parse(e.nativeEvent.data);
                  setSelectedLat(lat);
                  setSelectedLng(lng);
                } catch {}
              }}
            />
            <View style={{ backgroundColor: '#fff', padding: 16 }}>
              <Text style={{ color: '#666', fontSize: 13, marginBottom: 10 }} numberOfLines={2}>
                📍 {selectedAddress}
              </Text>
              <TouchableOpacity
                onPress={handleConfirm}
                style={{ backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>✅ Подтвердить адрес</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Ionicons name="location-outline" size={64} color="#ddd" />
            <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center', marginTop: 16 }}>
              Введи адрес магазина выше{'\n'}и выбери из списка
            </Text>
            <Text style={{ color: '#FF4500', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
              Поиск по городу: {city || 'Казахстан'}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}
