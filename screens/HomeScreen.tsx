import { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { DealCard } from '../components/DealCard';
import { styles } from '../components/styles';
import { CATEGORIES } from '../components/constants';
import { sendLocalNotification } from '../notifications';
import { Modal } from 'react-native';
import { StoreScreen } from './StoreScreen';

const CITIES = ['Все', 'Алматы', 'Астана', 'Шымкент', 'Актау', 'Актобе', 'Атырау', 'Павлодар', 'Караганда'];

const BANNERS = [
  { id: '1', emoji: '🔥', title: 'Скидки до 90%', subtitle: 'Только сегодня', color: '#FF4500' },
  { id: '2', emoji: '👟', title: 'Обувь со скидкой', subtitle: 'Nike, Adidas и другие', color: '#FF6B35' },
  { id: '3', emoji: '📱', title: 'Техника дешевле', subtitle: 'Лучшие предложения', color: '#E63946' },
];

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
            const [ch, cm] = [now.getHours(), now.getMinutes()];
            return (sh * 60 + sm) - (ch * 60 + cm);
          })(),
        }))
        .filter((hh: any) => hh.isNow || (hh.isSoon && hh.minutesLeft <= 180))
        .sort((a: any, b: any) => {
          if (a.isNow && !b.isNow) return -1;
          if (!a.isNow && b.isNow) return 1;
          return a.minutesLeft - b.minutesLeft;
        });

      setActiveHH(all);

      // Загружаем профили продавцов
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
          <TouchableOpacity
            key={hh.id}
            onPress={() => setSelectedHH(hh)}
            style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 10, elevation: 3 }}
            activeOpacity={0.9}
          >
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
                  {s?.storeAddress && <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>📍 {s.storeAddress}</Text>}
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
              <View style={{ position: 'absolute', top: 16, left: 16, backgroundColor: selectedHH.isNow ? '#4CAF50' : '#FF9800', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                  {selectedHH.isNow ? '🟢 Идёт прямо сейчас!' : `⏰ Через ${selectedHH.minutesLeft >= 60 ? `${Math.floor(selectedHH.minutesLeft / 60)}ч` : `${selectedHH.minutesLeft} мин`}`}
                </Text>
              </View>
              <View style={{ position: 'absolute', bottom: 16, right: 16, backgroundColor: '#FF4500', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 24 }}>-{selectedHH.discount}%</Text>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#222', marginBottom: 4 }}>{selectedHH.title}</Text>
              {selectedHH.description && <Text style={{ color: '#666', fontSize: 15, marginBottom: 16 }}>{selectedHH.description}</Text>}
              <View style={{ backgroundColor: '#FFF0EB', borderRadius: 14, padding: 14, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ backgroundColor: '#FF4500', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="time" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16 }}>Время акции</Text>
                  <Text style={{ color: '#FF4500', fontWeight: 'bold', fontSize: 18 }}>{selectedHH.startTime} — {selectedHH.endTime}</Text>
                </View>
              </View>
              {seller && (
                <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 }}>
                  <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 16, marginBottom: 12 }}>🏪 О заведении</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                      {seller.storeLogo
                        ? <Image source={{ uri: seller.storeLogo }} style={{ width: 56, height: 56 }} resizeMode="cover" />
                        : <Ionicons name="storefront" size={28} color="#FF4500" />
                      }
                    </View>
                    <View>
                      <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 17 }}>{seller.storeName || 'Без названия'}</Text>
                      {seller.storeCategory && <Text style={{ color: '#999', fontSize: 13 }}>{seller.storeCategory}</Text>}
                    </View>
                  </View>
                  {seller.storeAddress && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                      <Ionicons name="location" size={20} color="#FF4500" />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#999', fontSize: 12 }}>Адрес</Text>
                        <Text style={{ color: '#222', fontWeight: '600', fontSize: 15 }}>{seller.storeAddress}</Text>
                      </View>
                    </View>
                  )}
                  {seller.storePhone && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                      <Ionicons name="call" size={20} color="#4CAF50" />
                      <View>
                        <Text style={{ color: '#999', fontSize: 12 }}>Телефон</Text>
                        <Text style={{ color: '#222', fontWeight: '600', fontSize: 15 }}>{seller.storePhone}</Text>
                      </View>
                    </View>
                  )}
                  {seller.storeDescription && (
                    <View style={{ paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' }}>
                      <Text style={{ color: '#666', fontSize: 14, lineHeight: 20 }}>{seller.storeDescription}</Text>
                    </View>
                  )}
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

export function HomeScreen({ user, userCity }: { user: User | null, userCity?: string | null }) {
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [activeCity, setActiveCity] = useState('Все');
  const [sortBy, setSortBy] = useState<'new' | 'discount' | 'price'>('new');
  const [minDiscount, setMinDiscount] = useState(0);
  const [deals, setDeals] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Все');
  const [showDeals, setShowDeals] = useState(false);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    const timer = setInterval(() => setBannerIndex(i => (i + 1) % BANNERS.length), 3000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'deals'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => {
      const newDeals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (!isFirstLoad.current && newDeals.length > deals.length) {
        const newest = newDeals[0] as any;
        sendLocalNotification('🔥 Новая скидка в O-GO!', `${newest.title} — -${newest.discount}%`);
      }
      isFirstLoad.current = false;
      setDeals(newDeals);
    });
  }, []);

  if (selectedSellerId) return (
    <StoreScreen sellerId={selectedSellerId} user={user} onBack={() => setSelectedSellerId(null)} />
  );

  const sortedDeals = [...deals].sort((a, b) => {
    if (a.isBoosted && !b.isBoosted) return -1;
    if (!a.isBoosted && b.isBoosted) return 1;
    return 0;
  });

  const filtered = sortedDeals
    .filter(d => !d.isHidden)
    .filter(d => !userCity || userCity === 'Все' || d.city === userCity)
    .filter(d => activeCategory === 'Все' || d.category === activeCategory)
    .filter(d => activeCity === 'Все' || d.city === activeCity)
    .filter(d => d.discount >= minDiscount)
    .filter(d => searchQuery === '' || d.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'discount') return b.discount - a.discount;
      if (sortBy === 'price') return a.newPrice - b.newPrice;
      return 0;
    });

  if (!showDeals) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        <View style={{ backgroundColor: '#FF4500', paddingTop: 16, paddingBottom: 24, paddingHorizontal: 16 }}>
          <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>O-GO</Text>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', marginBottom: 16 }}>Все скидки в одном месте!</Text>
          <TouchableOpacity onPress={() => setShowDeals(true)} style={{ backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="search" size={20} color="#aaa" style={{ marginRight: 8 }} />
            <Text style={{ color: '#aaa', fontSize: 16 }}>Поиск скидок и акций</Text>
          </TouchableOpacity>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[
                { name: 'Все скидки', icon: 'flash' as keyof typeof Ionicons.glyphMap, cat: 'Все', color: '#FF4500' },
                { name: 'Еда', icon: 'restaurant' as keyof typeof Ionicons.glyphMap, cat: '🍕 Еда', color: '#FF6B35' },
                { name: 'Техника', icon: 'phone-portrait' as keyof typeof Ionicons.glyphMap, cat: '📱 Техника', color: '#6366F1' },
                { name: 'Одежда', icon: 'shirt' as keyof typeof Ionicons.glyphMap, cat: '👕 Одежда', color: '#EC4899' },
                { name: 'Обувь', icon: 'footsteps' as keyof typeof Ionicons.glyphMap, cat: '👟 Обувь', color: '#F59E0B' },
                { name: 'Косметика', icon: 'color-palette' as keyof typeof Ionicons.glyphMap, cat: '💄 Косметика', color: '#A855F7' },
                { name: 'Магазины', icon: 'bag-handle' as keyof typeof Ionicons.glyphMap, cat: '📦 Магазин', color: '#10B981' },
                { name: 'Все', icon: 'grid' as keyof typeof Ionicons.glyphMap, cat: 'Все', color: '#64748B' },
              ].map(item => (
                <TouchableOpacity
                  key={item.name}
                  style={{ width: '25%', alignItems: 'center', marginBottom: 20, paddingHorizontal: 4 }}
                  onPress={() => { setActiveCategory(item.cat); setShowDeals(true); }}
                >
                  <View style={{ width: 56, height: 56, borderRadius: 18, backgroundColor: item.color + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 6, borderWidth: 1.5, borderColor: item.color + '30' }}>
                    <Ionicons name={item.icon} size={24} color={item.color} />
                  </View>
                  <Text style={{ fontSize: 11, color: '#444', textAlign: 'center', fontWeight: '600', lineHeight: 14 }}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.banner, { backgroundColor: BANNERS[bannerIndex].color, marginHorizontal: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>{BANNERS[bannerIndex].title}</Text>
              <Text style={styles.bannerSubtitle}>{BANNERS[bannerIndex].subtitle}</Text>
              <TouchableOpacity style={styles.bannerBadge} onPress={() => setShowDeals(true)}>
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
            <TouchableOpacity onPress={() => setShowDeals(true)}>
              <Text style={{ color: '#FF4500', fontWeight: '600' }}>Смотреть все</Text>
            </TouchableOpacity>
          </View>

          {deals.filter(d => !d.isHidden).slice(0, 3).map(deal => (
            <DealCard key={deal.id} item={deal} user={user} onStorePress={setSelectedSellerId} />
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <View style={{ backgroundColor: '#FF4500', paddingTop: 16, paddingBottom: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => setShowDeals(false)} style={{ marginRight: 10 }}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="search" size={18} color="#aaa" style={{ marginRight: 8 }} />
          <TextInput style={{ flex: 1, fontSize: 15, color: '#222' }} placeholder="Поиск скидок..." value={searchQuery} onChangeText={setSearchQuery} autoFocus placeholderTextColor="#aaa" />
        </View>
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <DealCard item={item} user={user} onStorePress={setSelectedSellerId} />}
        contentContainerStyle={{ padding: 12, paddingTop: 0 }}
        ListHeaderComponent={
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {CATEGORIES.map(cat => (
                <TouchableOpacity key={cat} style={[styles.categoryBtn, activeCategory === cat && styles.categoryBtnActive]} onPress={() => setActiveCategory(cat)}>
                  <Text style={styles.categoryText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={{ backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location" size={18} color="#FF4500" style={{ marginRight: 6 }} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {CITIES.map(city => (
                  <TouchableOpacity key={city} style={[{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, marginRight: 6, backgroundColor: activeCity === city ? '#FF4500' : '#f0f0f0' }]} onPress={() => setActiveCity(city)}>
                    <Text style={{ color: activeCity === city ? '#fff' : '#666', fontSize: 13, fontWeight: '600' }}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <Text style={{ color: '#999', fontSize: 13, marginBottom: 8 }}>Найдено: <Text style={{ color: '#FF4500', fontWeight: 'bold' }}>{filtered.length}</Text> скидок</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                {(['new', 'discount', 'price'] as const).map(s => (
                  <TouchableOpacity key={s} style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]} onPress={() => setSortBy(s)}>
                    <Text style={[styles.sortText, sortBy === s && styles.sortTextActive]}>{s === 'new' ? '🆕 Новые' : s === 'discount' ? '🔥 По скидке' : '💰 По цене'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[0, 30, 50, 70, 90].map(pct => (
                  <TouchableOpacity key={pct} style={[styles.sortBtn, minDiscount === pct && styles.sortBtnActive]} onPress={() => setMinDiscount(pct)}>
                    <Text style={[styles.sortText, minDiscount === pct && styles.sortTextActive]}>{pct === 0 ? 'Все' : `${pct}%+`}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>😔</Text>
            <Text style={{ color: '#aaa', fontSize: 16, textAlign: 'center' }}>Скидок пока нет</Text>
          </View>
        }
      />
    </View>
  );
}
