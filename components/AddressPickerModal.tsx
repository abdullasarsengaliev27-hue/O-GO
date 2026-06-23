import { useState, useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { styles } from './styles';

interface AddressResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function AddressPickerModal({ visible, city, onConfirm, onClose }: {
  visible: boolean;
  city: string;
  onConfirm: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AddressResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [showMap, setShowMap] = useState(false);
  const webViewRef = useRef<any>(null);

  const searchAddress = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const q = encodeURIComponent(`${query}, ${city}, Казахстан`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=5&accept-language=ru`, {
        headers: { 'User-Agent': 'O-GO-App/1.0' }
      });
      const data = await res.json();
      setResults(data);
      if (data.length === 0) Alert.alert('Не найдено', 'Уточни адрес — укажи улицу и номер дома');
    } catch (e) {
      Alert.alert('Ошибка', 'Нет подключения к интернету');
    }
    setSearching(false);
  };

  const selectResult = (item: AddressResult) => {
    setSelectedAddress(item.display_name);
    setSelectedLat(Number(item.lat));
    setSelectedLng(Number(item.lon));
    setResults([]);
    setQuery(item.display_name.split(',').slice(0, 3).join(','));
    setShowMap(true);
  };

  const mapHtml = selectedLat && selectedLng ? `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; }
    #map { width: 100vw; height: 100vh; }
    #hint { position: absolute; top: 10px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.7); color: white; padding: 8px 14px; border-radius: 20px; font-size: 13px; z-index: 1000; white-space: nowrap; }
  </style>
</head>
<body>
<div id="hint">📍 Перетащи точку на вход в магазин</div>
<div id="map"></div>
<script>
  var map = L.map('map').setView([${selectedLat}, ${selectedLng}], 17);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

  var marker = L.marker([${selectedLat}, ${selectedLng}], {
    draggable: true,
    icon: L.divIcon({
      className: '',
      html: '<div style="background:#FF4500;width:20px;height:20px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>',
      iconAnchor: [10, 10]
    })
  }).addTo(map);

  marker.on('dragend', function(e) {
    var pos = marker.getLatLng();
    window.ReactNativeWebView.postMessage(JSON.stringify({ lat: pos.lat, lng: pos.lng }));
  });

  // Сразу отправляем начальные координаты
  window.ReactNativeWebView.postMessage(JSON.stringify({ lat: ${selectedLat}, lng: ${selectedLng} }));
</script>
</body>
</html>` : '';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Шапка */}
        <View style={{ backgroundColor: '#FF4500', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>📍 Адрес магазина</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {!showMap ? (
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={{ color: '#666', fontSize: 14, marginBottom: 12 }}>
              Введи точный адрес с номером дома{'\n'}
              Например: <Text style={{ fontWeight: 'bold' }}>30 микрорайон, дом 12</Text>
            </Text>

            {/* Поиск */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Ул. Абая 45 или 30 мкр дом 12"
                value={query}
                onChangeText={setQuery}
                placeholderTextColor="#aaa"
                onSubmitEditing={searchAddress}
              />
              <TouchableOpacity
                onPress={searchAddress}
                style={{ backgroundColor: '#FF4500', borderRadius: 12, width: 48, justifyContent: 'center', alignItems: 'center' }}
              >
                {searching ? <ActivityIndicator color="#fff" /> : <Ionicons name="search" size={22} color="#fff" />}
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#999', fontSize: 12, marginBottom: 12 }}>
              🔍 Поиск по городу: <Text style={{ fontWeight: 'bold' }}>{city}</Text>
            </Text>

            {/* Результаты */}
            {results.map((item, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => selectResult(item)}
                style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#eee' }}
              >
                <Text style={{ color: '#222', fontSize: 14 }} numberOfLines={2}>{item.display_name}</Text>
                <Text style={{ color: '#FF4500', fontSize: 12, marginTop: 4 }}>
                  📍 {Number(item.lat).toFixed(4)}, {Number(item.lon).toFixed(4)}
                </Text>
              </TouchableOpacity>
            ))}

            {results.length === 0 && query.length > 0 && !searching && (
              <View style={{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FFD700' }}>
                <Text style={{ color: '#333', fontSize: 13 }}>
                  💡 Советы для точного поиска:{'\n'}
                  • Укажи улицу и номер дома{'\n'}
                  • Или название ТЦ/здания{'\n'}
                  • Например: "мкр 30, дом 15"
                </Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Адрес */}
            <View style={{ backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
              <Text style={{ color: '#222', fontSize: 13 }} numberOfLines={2}>📍 {selectedAddress}</Text>
              <TouchableOpacity onPress={() => { setShowMap(false); setResults([]); }} style={{ marginTop: 6 }}>
                <Text style={{ color: '#FF4500', fontSize: 13 }}>← Изменить адрес</Text>
              </TouchableOpacity>
            </View>

            {/* Карта с перетаскиванием */}
            <WebView
              ref={webViewRef}
              source={{ html: mapHtml }}
              style={{ flex: 1 }}
              javaScriptEnabled
              originWhitelist={['*']}
              onMessage={(event) => {
                try {
                  const data = JSON.parse(event.nativeEvent.data);
                  setSelectedLat(data.lat);
                  setSelectedLng(data.lng);
                } catch (e) {}
              }}
            />

            {/* Кнопка подтвердить */}
            <View style={{ padding: 16, backgroundColor: '#fff' }}>
              <View style={{ backgroundColor: '#E8F5E9', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                <Text style={{ color: '#4CAF50', fontSize: 13, fontWeight: 'bold' }}>
                  ✅ Координаты сохранены:{'\n'}
                  {selectedLat?.toFixed(5)}, {selectedLng?.toFixed(5)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.bigBtn}
                onPress={() => {
                  if (selectedLat && selectedLng) {
                    onConfirm(selectedAddress, selectedLat, selectedLng);
                    onClose();
                  }
                }}
              >
                <Text style={styles.bigBtnText}>✅ Подтвердить местоположение</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
