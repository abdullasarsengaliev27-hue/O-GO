import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, TextInput, Image, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';
import { styles } from '../components/styles';
import { sendLocalNotification } from '../notifications';
import { StoreScreen } from './StoreScreen';

const CITIES = ['Все', 'Алматы', 'Астана', 'Шымкент', 'Актау', 'Актобе', 'Атырау', 'Павлодар', 'Караганда'];

const BANNERS = [
  { id: '1', emoji: '🔥', title: 'Скидки до 90%', subtitle: 'Только сегодня', color: '#FF4500' },
  { id: '2', emoji: '👟', title: 'Обувь со скидкой', subtitle: 'Nike, Adidas и другие', color: '#FF6B35' },
  { id: '3', emoji: '📱', title: 'Техника дешевле', subtitle: 'Лучшие предложения', color: '#E63946' },
];

type CatKey = 'all' | 'food' | 'tech' | 'clothing' | 'shoes' | 'beauty';

const CATS: { key: CatKey; name: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'all', name: 'Все скидки', icon: 'flash', color: '#FF4500' },
  { key: 'food', name: 'Еда', icon: 'restaurant', color: '#FF6B35' },
  { key: 'tech', name: 'Техника', icon: 'phone-portrait', color: '#6366F1' },
  { key: 'clothing', name: 'Одежда', icon: 'shirt', color: '#EC4899' },
  { key: 'shoes', name: 'Обувь', icon: 'footsteps', color: '#F59E0B' },
  { key: 'beauty', name: 'Косметика', icon: 'color-palette', color: '#A855F7' },
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
const sameCity = (a?: string | null, b?: string | null) => norm(a) === norm(b);

function HappyHoursBanner() {
  const [activeHH, setActiveHH] = useState<any[]>([]);
  const [selectedHH, setSelectedHH] = useState<any>(null);
  const [sellerProfiles, setSellerProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    return onSnapshot(collection(db, 'happyHours'), async snap => {
      const now = new Date();
      const currentDay = (now.getDay() + 6) % 7;
      const currentHour = `${String(now.getHours()).padStart(2, '0')}:00`;
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((hh: any) => hh.isActive && hh.days?.includes(currentDay))
        .map((hh: any) => ({
          ...hh,
          isNow: currentHour >= hh.startTime && currentHour < hh.endTime,
          isSoon: currentHour < hh.startTime,
          minutesLeft: (() => {
            const [sh, sm] = hh.startTime.split(':').map(Number);
            return (sh * 60 + sm) - (now.getHours() * 60 + now.getMinutes());
          })(),
        }))
        .filter((hh: any) => hh.isNow || (hh.isSoon && hh.minutesLeft <= 180))
        .sort((a: any, b: any) => {
          if (a.isNow && !b.isNow) return -1;
          if (!a.isNow && b.isNow) return 1;
          return a.minutesLeft - b.minutesLeft;
        });
      setActiveHH(all);
      const profiles: Record<string, any> = {};
      for (const hh of all) {
        if (hh.sellerId && !profiles[hh.sellerId]) {
          const snap2 = await getDoc(doc(db, 'users', hh.sellerId));
          if (snap2.exists()) profiles[hh.sellerId] = snap2.data();
        }
      }
      setSellerProfiles(profiles);
    });
  }, []);

  if (activeHH.length === 0) return null;
  const seller = selectedHH ? sellerProfiles[selectedHH.sellerId] : null;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222', marginBottom: 10 }}>
        ⚡ Счастливые часы {activeHH.filter((h: any) => h.isNow).length > 0 ? '· Идут сейчас!' : '· Скоро'}
      </Text>
      {activeHH.map(hh => {
        const s = sellerProfiles[hh.sellerId];
        return (
          <TouchableOpacity key={hh.id} onPress={() => setSelectedHH(hh)} style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 10, elevation: 3 }} activeOpacity={0.9}>
            {hh.imageUrl
              ? <Image source={{ uri: hh.imageUrl }} style={{ width: '100%', height: 160 }} resizeMode="cover" />
              : <View style={{ backgroundColor: '#FF9800', height: 160, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 48 }}>⚡</Text>
                </View>
            }
            <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{hh.title}</Text>
                  {s?.storeName && <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>🏪 {s.storeName}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{ backgroundColor: '#FF4500', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: 4 }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>-{hh.discount}%</Text>
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>до {hh.endTime}</Text>
                </View>
              </View>
            </View>
            {hh.isNow
              ? <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: '#4CAF50', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>🟢 Идёт сейчас!</Text>
                </View>
              : <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: '#FF9800', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                    ⏰ Через {hh.minutesLeft >= 60 ? `${Math.floor(hh.minutesLeft / 60)}ч ${hh.minutesLeft % 60}мин` : `${hh.minutesLeft} мин`}
                  </Text>
                </View>
            }
          </TouchableOpacity>
        );
      })}
      {selectedHH && (
        <Modal visible={true} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedHH(null)}>
          <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            <View style={{ position: 'relative' }}>
              {selectedHH.imageUrl
                ? <Image source={{ uri: selectedHH.imageUrl }} style={{ width: '100%', height: 220 }} resizeMode="cover" />
                : <View style={{ backgroundColor: '#FF9800', height: 220, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 64 }}>⚡</Text>
                  </View>
              }
              <TouchableOpacity onPress={() => setSelectedHH(null)} style={{ position: 'absolute', top: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.5)', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
              <View style={{ position: 'absolute', bottom: 16, right: 16, backgroundColor: '#FF4500', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 24 }}>-{selectedHH.discount}%</Text>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 4 }}>{selectedHH.title}</Text>
              {selectedHH.description && <Text style={{ color: '#666', fontSize: 15, marginBottom: 16 }}>{selectedHH.description}</Text>}
              <View style={{ backgroundColor: '#FFF0EB', borderRadius: 14, padding: 14, marginBottom: 12 }}>
                <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16 }}>Время акции</Text>
                <Text style={{ color: '#FF4500', fontWeight: 'bold', fontSize: 18 }}>{selectedHH.startTime} — {selectedHH.endTime}</Text>
              </View>
              {seller && (
                <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 8 }}>🏪 {seller.storeName || 'Без названия'}</Text>
                  {seller.storeAddress && <Text style={{ color: '#555', fontSize: 14, marginBottom: 4 }}>📍 {seller.storeAddress}</Text>}
                  {seller.storePhone && <Text style={{ color: '#555', fontSize: 14 }}>📞 {seller.storePhone}</Text>}
                </View>
              )}
              <TouchableOpacity
                style={{ backgroundColor: selectedHH.isNow ? '#FF4500' : '#FF9800', borderRadius: 14, paddingVertical: 16, alignItems: 'center' }}
                onPress={() => setSelectedHH(null)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>
                  {selectedHH.isNow ? 'Понятно, иду туда! 🏃' : `Приду в ${selectedHH.startTime} ⏰`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Modal>
      )}
    </View>
  );
}

export function HomeScreen({ user, userCity, userRole }: {
  user: User | null,
  userCity?: string | null,
  userRole?: string
}) {
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 10;

  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState('Все');
  const [sortBy, setSortBy] = useState<'new' | 'discount' | 'price'>('new');
  const [deals, setDeals] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CatKey>('all');
  const [screenMode, setScreenMode] = useState<'home' | 'category' | 'search'>('home');
  const [activeBanners, setActiveBanners] = useState<any[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<any>(null); // открытый баннер
  const isFirstLoad = useRef(true);
  const dealsCountRef = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => setBannerIndex(i => (i + 1) % BANNERS.length), 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'deals'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      const newDeals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!isFirstLoad.current && newDeals.length > dealsCountRef.current) {
        const newest = newDeals[0] as any;
        sendLocalNotification('🔥 Новая скидка в O-GO!', `${newest.title} — -${newest.discount}%`);
      }
      isFirstLoad.current = false;
      dealsCountRef.current = newDeals.length;
      setDeals(newDeals);
    });
  }, []);

  useEffect(() => {
    return onSnapshot(collection(db, 'users'), snap => {
      const now = new Date().toISOString();
      setActiveBanners(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter((u: any) => u.hasBanner && u.bannerUntil && u.bannerUntil > now)
      );
    });
  }, []);

  if (selectedSellerId) return (
    <StoreScreen sellerId={selectedSellerId} user={user} onBack={() => setSelectedSellerId(null)} />
  );

  const isBoostActive = (d: any) => d.isBoosted && d.boostedUntil && new Date(d.boostedUntil) > new Date();

  const sortedDeals = [...deals].sort((a, b) => {
    if (isBoostActive(a) && !isBoostActive(b)) return -1;
    if (!isBoostActive(a) && isBoostActive(b)) return 1;
    return 0;
  });

  const visibleDeals = sortedDeals.filter(d => !d.isHidden);
  const noCityFilter = !userCity || userCity === 'Все';
  const cityDeals = noCityFilter ? visibleDeals : visibleDeals.filter(d => sameCity(d.city, userCity));
  const homeDeals = cityDeals.length > 0 ? cityDeals : visibleDeals;
  const showingAllCities = !noCityFilter && cityDeals.length === 0 && visibleDeals.length > 0;

  const filtered = homeDeals
    .filter(d => matchCategory(d, activeCategory))
    .filter(d => activeCity === 'Все' || sameCity(d.city, activeCity))
    .filter(d => searchQuery === '' || d.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'discount') return b.discount - a.discount;
      if (sortBy === 'price') return a.newPrice - b.newPrice;
      return 0;
    });

  const openCategory = (key: CatKey) => {
    setActiveCategory(key);
    setActiveCity('Все');
    setSortBy('new');
    setScreenMode('category');
  };

  // ===== Окно с полноразмерным баннером =====
  const bannerModal = (
    <Modal
      visible={!!selectedBanner}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedBanner(null)}
    >
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity
          onPress={() => setSelectedBanner(null)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={{ position: 'absolute', top: insets.top + 10, right: 16, zIndex: 100, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}
        >
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>

        {selectedBanner?.storeName ? (
          <View style={{ position: 'absolute', top: insets.top + 16, left: 16, right: 70, zIndex: 100 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }} numberOfLines={1}>
              🏪 {selectedBanner.storeName}
            </Text>
          </View>
        ) : null}

        {selectedBanner?.bannerImage ? (
          <Image
            source={{ uri: selectedBanner.bannerImage }}
            style={{ width: '100%', height: '80%' }}
            resizeMode="contain"
          />
        ) : (
          <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
            <Text style={{ fontSize: 56, marginBottom: 12 }}>⚡</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center' }}>
              {selectedBanner?.storeName || 'Магазин'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 8, textAlign: 'center' }}>
              Продавец не добавил фото к баннеру
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );

  // ===== Экран категории =====
  if (screenMode === 'category') {
    const cat = CATS.find(c => c.key === activeCategory) || CATS[0];
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ backgroundColor: '#FF4500', paddingTop: topPad, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity
            onPress={() => { setScreenMode('home'); setActiveCategory('all'); }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
            <Ionicons name={cat.icon} size={20} color="#fff" />
          </View>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', flex: 1 }}>{cat.name}</Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{filtered.length} скидок</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#fff', maxHeight: 50 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          {CITIES.map(city => (
            <TouchableOpacity key={city} onPress={() => setActiveCity(city)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: activeCity === city ? '#FF4500' : '#f0f0f0' }}>
              <Text style={{ color: activeCity === city ? '#fff' : '#666', fontSize: 13, fontWeight: '600' }}>{city}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#fff', maxHeight: 46, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          {(['new', 'discount', 'price'] as const).map(s => (
            <TouchableOpacity key={s} onPress={() => setSortBy(s)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, backgroundColor: sortBy === s ? '#FF4500' : '#f0f0f0' }}>
              <Text style={{ color: sortBy === s ? '#fff' : '#666', fontSize: 13, fontWeight: '600' }}>
                {s === 'new' ? '🆕 Новые' : s === 'discount' ? '🔥 По скидке' : '💰 По цене'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <DealCard item={item} user={user} onStorePress={setSelectedSellerId} userRole={userRole} />}
          contentContainerStyle={{ padding: 12 }}
          ListEmptyComponent={
            <View style={[styles.center, { marginTop: 60 }]}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>😔</Text>
              <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center' }}>
                {activeCategory === 'all' ? 'Скидок пока нет' : `В категории «${cat.name}» пока нет скидок`}
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  // ===== Экран поиска =====
  if (screenMode === 'search') {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ backgroundColor: '#FF4500', paddingTop: topPad, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => { setScreenMode('home'); setSearchQuery(''); setActiveCategory('all'); }}
            style={{ marginRight: 10 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, fontSize: 15, color: '#222' }}
              placeholder="Поиск скидок..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              placeholderTextColor="#aaa"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#aaa" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#fff', maxHeight: 50 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
          {CATS.map(c => (
            <TouchableOpacity key={c.key} onPress={() => setActiveCategory(c.key)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: activeCategory === c.key ? '#FF4500' : '#f0f0f0' }}>
              <Text style={{ color: activeCategory === c.key ? '#fff' : '#666', fontSize: 13, fontWeight: '600' }}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <DealCard item={item} user={user} onStorePress={setSelectedSellerId} userRole={userRole} />}
          contentContainerStyle={{ padding: 12 }}
          ListHeaderComponent={
            <Text style={{ color: '#999', fontSize: 13, marginBottom: 8 }}>
              Найдено: <Text style={{ color: '#FF4500', fontWeight: 'bold' }}>{filtered.length}</Text> скидок
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>😔</Text>
              <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center' }}>
                {searchQuery ? `Ничего не найдено по «${searchQuery}»` : 'Скидок пока нет'}
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  // ===== Главный экран =====
  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      {bannerModal}

      <View style={{ backgroundColor: '#FF4500', paddingTop: topPad, paddingBottom: 24, paddingHorizontal: 16 }}>
        <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>O-GO</Text>
        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', marginBottom: 16 }}>Все скидки в одном месте!</Text>
        <TouchableOpacity
          onPress={() => { setActiveCategory('all'); setScreenMode('search'); }}
          style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}
        >
          <Ionicons name="search" size={20} color="#aaa" style={{ marginRight: 8 }} />
          <Text style={{ color: '#aaa', fontSize: 16 }}>Поиск скидок и акций</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {/* 6 категорий */}
        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {CATS.map(item => (
              <TouchableOpacity
                key={item.key}
                style={{ width: '33.3%', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 }}
                onPress={() => openCategory(item.key)}
              >
                <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: item.color + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1.5, borderColor: item.color + '30' }}>
                  <Ionicons name={item.icon} size={24} color={item.color} />
                </View>
                <Text style={{ fontSize: 11, color: '#444', textAlign: 'center', fontWeight: '600', lineHeight: 14 }}>{item.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Платные баннеры «Распродажа дня» — по нажатию открывается ФОТО баннера */}
        {activeBanners.map((banner: any) => (
          <TouchableOpacity
            key={banner.id}
            activeOpacity={0.9}
            style={{ borderRadius: 20, marginBottom: 12, overflow: 'hidden', elevation: 4 }}
            onPress={() => setSelectedBanner(banner)}
          >
            {banner.bannerImage
              ? <>
                  <Image source={{ uri: banner.bannerImage }} style={{ width: '100%', height: 140 }} resizeMode="cover" />
                  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                      <View style={{ backgroundColor: '#FF4500', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 4 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>⚡ РАСПРОДАЖА ДНЯ</Text>
                      </View>
                      <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{banner.storeName || 'Магазин'}</Text>
                    </View>
                    <View style={{ backgroundColor: '#FF4500', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Открыть</Text>
                    </View>
                  </View>
                </>
              : <View style={{ backgroundColor: '#FF4500', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>⚡ РАСПРОДАЖА ДНЯ</Text>
                    </View>
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>{banner.storeName || 'Магазин'}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}>Специальные скидки только сегодня!</Text>
                  </View>
                  <View style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 }}>
                    <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 13 }}>Открыть</Text>
                  </View>
                </View>
            }
          </TouchableOpacity>
        ))}

        {/* Баннер-слайдер */}
        <View style={[styles.banner, { backgroundColor: BANNERS[bannerIndex].color, marginHorizontal: 0 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>{BANNERS[bannerIndex].title}</Text>
            <Text style={styles.bannerSubtitle}>{BANNERS[bannerIndex].subtitle}</Text>
            <TouchableOpacity style={styles.bannerBadge} onPress={() => openCategory('all')}>
              <Text style={{ color: '#FF4500', fontWeight: 'bold', fontSize: 13 }}>Смотреть все →</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 64 }}>{BANNERS[bannerIndex].emoji}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10, marginBottom: 16 }}>
          {BANNERS.map((_, i) => (
            <View key={i} style={{ width: i === bannerIndex ? 20 : 8, height: 8, borderRadius: 4, backgroundColor: i === bannerIndex ? '#FF4500' : '#ddd' }} />
          ))}
        </View>

        <HappyHoursBanner />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#222' }}>🔥 Горячие скидки</Text>
          <TouchableOpacity onPress={() => openCategory('all')}>
            <Text style={{ color: '#FF4500', fontWeight: '600' }}>Смотреть все ({homeDeals.length})</Text>
          </TouchableOpacity>
        </View>

        {showingAllCities && (
          <View style={{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#FFD700' }}>
            <Text style={{ color: '#666', fontSize: 12 }}>
              В городе «{userCity}» пока нет скидок — показываем скидки из других городов.
            </Text>
          </View>
        )}

        {homeDeals.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>😔</Text>
            <Text style={{ color: '#aaa', fontSize: 16 }}>Скидок пока нет</Text>
          </View>
        ) : (
          homeDeals.slice(0, 10).map(deal => (
            <DealCard key={deal.id} item={deal} user={user} onStorePress={setSelectedSellerId} userRole={userRole} />
          ))
        )}

        {homeDeals.length > 10 && (
          <TouchableOpacity
            onPress={() => openCategory('all')}
            style={{ backgroundColor: '#FF4500', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 24 }}
          >
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Показать все {homeDeals.length} скидок</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
