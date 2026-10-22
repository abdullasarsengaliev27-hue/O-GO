import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { styles } from '../../components/styles';
import { AddressPickerModal } from '../../components/AddressPickerModal';
import { uploadImage } from '../../utils/uploadImage';

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

const SIZES_CLOTHING = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const SIZES_SHOES = ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const COLORS = ['Черный', 'Белый', 'Серый', 'Красный', 'Синий', 'Зеленый', 'Желтый', 'Розовый', 'Коричневый', 'Бежевый'];
const FOOD_TAGS = ['🥩 Халяль', '🥗 Вегетарианское', '🌾 Безглютеновое', '🌶 Острое', '👶 Детское меню', '🐟 Рыбное'];
const GUARANTEE_OPTIONS = ['Без гарантии', '3 месяца', '6 месяцев', '1 год', '2 года'];
const VOLUME_UNITS = ['мл', 'л', 'г', 'кг'];
const CITIES = ['Алматы', 'Астана', 'Шымкент', 'Актау', 'Актобе', 'Атырау', 'Павлодар', 'Караганда'];
const CATEGORIES = [
  { id: 'clothing', label: 'Одежда и Обувь', emoji: '👕' },
  { id: 'food', label: 'Еда и рестораны', emoji: '🍔' },
  { id: 'tech', label: 'Техника и гаджеты', emoji: '💻' },
  { id: 'beauty', label: 'Косметика и парфюм', emoji: '💄' },
];

export function AddDealScreen({ user }: { user: User }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [marketPrice, setMarketPrice] = useState('');
  const [store, setStore] = useState('');
  const [city, setCity] = useState('');
  const [cat, setCat] = useState('clothing');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageAspect, setImageAspect] = useState<[number, number]>([4, 5]);
  const [hasDelivery, setHasDelivery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exactAddress, setExactAddress] = useState('');
  const [dealLat, setDealLat] = useState<number | null>(null);
  const [dealLng, setDealLng] = useState<number | null>(null);
  const [showAddressPicker, setShowAddressPicker] = useState(false);

  // Одежда
  const [clothingType, setClothingType] = useState<'clothing' | 'shoes'>('clothing');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [outOfStockSizes, setOutOfStockSizes] = useState<string[]>([]);
  const [useColors, setUseColors] = useState(false);
  const [colorVariants, setColorVariants] = useState<{ color: string, imageUri?: string }[]>([]);

  // Еда
  const [foodTags, setFoodTags] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<{ name: string, price: string }[]>([]);
  const [workingHours, setWorkingHours] = useState('');
  const [weight, setWeight] = useState('');

  // Техника
  const [specs, setSpecs] = useState('');
  const [guarantee, setGuarantee] = useState('Без гарантии');
  const [isNew, setIsNew] = useState(true);
  const [techColors, setTechColors] = useState<{ color: string, imageUri?: string }[]>([]);

  // Косметика
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('мл');
  const [expiryDate, setExpiryDate] = useState('');
  const [composition, setComposition] = useState('');

  const discount = oldPrice && newPrice
    ? Math.round((1 - Number(newPrice) / Number(oldPrice)) * 100)
    : 0;

  const pickMainImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к фото');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: imageAspect,
      quality: 0.7,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const pickColorImage = async (color: string, istech = false) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.6,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      if (istech) setTechColors(prev => prev.map(v => v.color === color ? { ...v, imageUri: uri } : v));
      else setColorVariants(prev => prev.map(v => v.color === color ? { ...v, imageUri: uri } : v));
    }
  };

  const handleSubmit = async () => {
    if (!title || !oldPrice || !newPrice || !store || !city) {
      return Alert.alert('Ошибка', 'Заполни все обязательные поля');
    }
    if (Number(newPrice) >= Number(oldPrice)) {
      return Alert.alert('Ошибка', 'Новая цена должна быть меньше старой');
    }
    setLoading(true);
    try {
      let imageUrl = null;
      if (imageUri) {
        const resized = await ImageManipulator.manipulateAsync(
          imageUri,
          [{ resize: { width: imageAspect[0] === 16 ? 800 : 600, height: imageAspect[0] === 16 ? 450 : 750 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
        );
        const response = await fetch(resized.uri);
        const blob = await response.blob();
        const reader = new FileReader();
        imageUrl = await new Promise(resolve => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }

      const cityCoords = CITY_COORDS[city] || CITY_COORDS['Алматы'];
      const baseData: any = {
        title, description,
        oldPrice: Number(oldPrice),
        newPrice: Number(newPrice),
        marketPrice: marketPrice ? Number(marketPrice) : null,
        discount, store, city, imageUrl,
        imageAspect,
        hasDelivery,
        category: cat,
        exactAddress,
        lat: dealLat || (cityCoords.lat + (Math.random() - 0.5) * 0.018),
        lng: dealLng || (cityCoords.lng + (Math.random() - 0.5) * 0.018),
        sellerId: user.uid,
        sellerEmail: user.email,
        createdAt: new Date().toISOString(),
        viewCount: 0,
        isBoosted: false,
      };

      const categoryData: any = {};
      if (cat === 'clothing') {
        categoryData.sizes = selectedSizes;
        categoryData.outOfStockSizes = outOfStockSizes;
        categoryData.colorVariants = useColors ? colorVariants.map(v => ({ color: v.color, image: v.imageUri || null })) : [];
        categoryData.clothingType = clothingType;
      } else if (cat === 'food') {
        categoryData.foodTags = foodTags;
        categoryData.menuItems = menuItems;
        categoryData.workingHours = workingHours;
        categoryData.weight = weight;
      } else if (cat === 'tech') {
        categoryData.specs = specs;
        categoryData.guarantee = guarantee;
        categoryData.isNew = isNew;
        categoryData.colorVariants = techColors.map(v => ({ color: v.color, image: v.imageUri || null }));
      } else if (cat === 'beauty') {
        categoryData.volume = volume;
        categoryData.volumeUnit = volumeUnit;
        categoryData.expiryDate = expiryDate;
        categoryData.composition = composition;
      }

      await addDoc(collection(db, 'deals'), { ...baseData, ...categoryData });
      Alert.alert('✅ Скидка добавлена!', 'Ваша скидка опубликована');
      setTitle(''); setDescription(''); setOldPrice(''); setNewPrice('');
      setMarketPrice(''); setStore(''); setCity(''); setImageUri(null);
      setSelectedSizes([]); setFoodTags([]); setMenuItems([]);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#222', marginBottom: 16 }}>➕ Добавить скидку</Text>

      {/* Категория */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <Text style={styles.label}>Категория *</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              onPress={() => setCat(c.id)}
              style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: cat === c.id ? '#FF4500' : '#f0f0f0' }}
            >
              <Text style={{ color: cat === c.id ? '#fff' : '#555', fontWeight: '600' }}>{c.emoji} {c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Основная инфо */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <Text style={styles.label}>Название товара *</Text>
        <TextInput style={styles.input} placeholder="Название скидки" value={title} onChangeText={setTitle} placeholderTextColor="#aaa" />

        <Text style={styles.label}>Описание</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Описание товара" value={description} onChangeText={setDescription} multiline placeholderTextColor="#aaa" />

        <Text style={styles.label}>Магазин *</Text>
        <TextInput style={styles.input} placeholder="Название магазина" value={store} onChangeText={setStore} placeholderTextColor="#aaa" />
      </View>

      {/* Цены */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <Text style={styles.label}>Старая цена (₸) *</Text>
        <TextInput style={styles.input} placeholder="10000" value={oldPrice} onChangeText={setOldPrice} keyboardType="numeric" placeholderTextColor="#aaa" />

        <Text style={styles.label}>Новая цена (₸) *</Text>
        <TextInput style={styles.input} placeholder="7000" value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" placeholderTextColor="#aaa" />

        <Text style={styles.label}>Рыночная цена (₸) — для сравнения</Text>
        <TextInput style={styles.input} placeholder="15000" value={marketPrice} onChangeText={setMarketPrice} keyboardType="numeric" placeholderTextColor="#aaa" />

        {discount > 0 && (
          <View style={{ backgroundColor: '#FFF0EB', borderRadius: 10, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#FF4500', fontWeight: '800', fontSize: 18 }}>Скидка: -{discount}%</Text>
          </View>
        )}
      </View>

      {/* Город */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <Text style={styles.label}>Город *</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          {CITIES.map(c => (
            <TouchableOpacity key={c} onPress={() => setCity(c)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: city === c ? '#FF4500' : '#f0f0f0' }}>
              <Text style={{ color: city === c ? '#fff' : '#555', fontWeight: '600' }}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={() => setShowAddressPicker(true)}
          style={{ backgroundColor: '#FFF0EB', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Ionicons name="location" size={20} color="#FF4500" />
          <Text style={{ color: '#FF4500', fontWeight: '600', flex: 1 }} numberOfLines={1}>
            {exactAddress || 'Указать точный адрес на карте'}
          </Text>
          {exactAddress && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
        </TouchableOpacity>
      </View>

      {/* Фото */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
        <Text style={styles.label}>Формат фото</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <TouchableOpacity
            onPress={() => setImageAspect([4, 5])}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: imageAspect[0] === 4 ? '#FF4500' : '#f5f5f5', alignItems: 'center', borderWidth: 2, borderColor: imageAspect[0] === 4 ? '#FF4500' : 'transparent' }}
          >
            <Text style={{ fontSize: 20 }}>📱</Text>
            <Text style={{ color: imageAspect[0] === 4 ? '#fff' : '#333', fontWeight: '700', fontSize: 13 }}>4:5</Text>
            <Text style={{ color: imageAspect[0] === 4 ? 'rgba(255,255,255,0.8)' : '#999', fontSize: 11 }}>Вертикальный</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setImageAspect([16, 9])}
            style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: imageAspect[0] === 16 ? '#FF4500' : '#f5f5f5', alignItems: 'center', borderWidth: 2, borderColor: imageAspect[0] === 16 ? '#FF4500' : 'transparent' }}
          >
            <Text style={{ fontSize: 20 }}>🖥</Text>
            <Text style={{ color: imageAspect[0] === 16 ? '#fff' : '#333', fontWeight: '700', fontSize: 13 }}>16:9</Text>
            <Text style={{ color: imageAspect[0] === 16 ? 'rgba(255,255,255,0.8)' : '#999', fontSize: 11 }}>Горизонтальный</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Фото товара</Text>
        <TouchableOpacity onPress={pickMainImage} style={styles.imagePicker}>
          {imageUri
            ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: imageAspect[0] === 16 ? 180 : 240, borderRadius: 12 }} resizeMode="cover" />
            : <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <Ionicons name="camera" size={40} color="#FF4500" />
                <Text style={{ color: '#FF4500', fontWeight: '600', marginTop: 8 }}>Добавить фото</Text>
              </View>
          }
        </TouchableOpacity>
      </View>

      {/* Доставка */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View>
          <Text style={{ fontWeight: '700', color: '#1a1a1a', fontSize: 15 }}>🚚 Есть доставка</Text>
          <Text style={{ color: '#999', fontSize: 12 }}>Покупатели смогут заказать</Text>
        </View>
        <Switch value={hasDelivery} onValueChange={setHasDelivery} trackColor={{ true: '#FF4500' }} />
      </View>

      {/* ====== ОДЕЖДА ====== */}
      {cat === 'clothing' && (
        <>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <Text style={styles.label}>Тип</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TouchableOpacity onPress={() => setClothingType('clothing')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: clothingType === 'clothing' ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: clothingType === 'clothing' ? '#fff' : '#555', fontWeight: '600' }}>👕 Одежда</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setClothingType('shoes')} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: clothingType === 'shoes' ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: clothingType === 'shoes' ? '#fff' : '#555', fontWeight: '600' }}>👟 Обувь</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Размеры</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {(clothingType === 'clothing' ? SIZES_CLOTHING : SIZES_SHOES).map(size => (
                <TouchableOpacity
                  key={size}
                  onPress={() => {
                    if (selectedSizes.includes(size)) setSelectedSizes(prev => prev.filter(s => s !== size));
                    else setSelectedSizes(prev => [...prev, size]);
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: selectedSizes.includes(size) ? '#FF4500' : '#f0f0f0', opacity: outOfStockSizes.includes(size) ? 0.5 : 1 }}
                >
                  <Text style={{ color: selectedSizes.includes(size) ? '#fff' : '#555', fontWeight: '600' }}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Нет в наличии</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {selectedSizes.map(size => (
                <TouchableOpacity
                  key={size}
                  onPress={() => {
                    if (outOfStockSizes.includes(size)) setOutOfStockSizes(prev => prev.filter(s => s !== size));
                    else setOutOfStockSizes(prev => [...prev, size]);
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: outOfStockSizes.includes(size) ? '#999' : '#f0f0f0' }}
                >
                  <Text style={{ color: outOfStockSizes.includes(size) ? '#fff' : '#555', fontWeight: '600' }}>{size}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={styles.label}>Варианты цветов</Text>
              <Switch value={useColors} onValueChange={setUseColors} trackColor={{ true: '#FF4500' }} />
            </View>

            {useColors && (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => {
                        if (colorVariants.find(v => v.color === color)) {
                          setColorVariants(prev => prev.filter(v => v.color !== color));
                        } else {
                          setColorVariants(prev => [...prev, { color }]);
                        }
                      }}
                      style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: colorVariants.find(v => v.color === color) ? '#FF4500' : '#f0f0f0' }}
                    >
                      <Text style={{ color: colorVariants.find(v => v.color === color) ? '#fff' : '#555', fontSize: 13 }}>{color}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {colorVariants.map(variant => (
                  <View key={variant.color} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 }}>
                    <TouchableOpacity onPress={() => pickColorImage(variant.color)} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: variant.imageUri ? '#FF4500' : '#ddd', overflow: 'hidden' }}>
                      {variant.imageUri ? <Image source={{ uri: variant.imageUri }} style={{ width: 64, height: 64 }} resizeMode="cover" /> : <Ionicons name="camera" size={24} color="#aaa" />}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: 'bold', color: '#222' }}>{variant.color}</Text>
                      <Text style={{ color: variant.imageUri ? '#4CAF50' : '#999', fontSize: 12 }}>{variant.imageUri ? '✅ Фото добавлено' : 'Нажми для фото'}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </View>
        </>
      )}

      {/* ====== ЕДА ====== */}
      {cat === 'food' && (
        <>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <Text style={styles.label}>Теги еды</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {FOOD_TAGS.map(tag => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => {
                    if (foodTags.includes(tag)) setFoodTags(prev => prev.filter(t => t !== tag));
                    else setFoodTags(prev => [...prev, tag]);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: foodTags.includes(tag) ? '#FF4500' : '#f0f0f0' }}
                >
                  <Text style={{ color: foodTags.includes(tag) ? '#fff' : '#555', fontSize: 13 }}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Вес/Объём</Text>
            <TextInput style={styles.input} placeholder="300г" value={weight} onChangeText={setWeight} placeholderTextColor="#aaa" />

            <Text style={styles.label}>Часы работы</Text>
            <TextInput style={styles.input} placeholder="10:00 - 22:00" value={workingHours} onChangeText={setWorkingHours} placeholderTextColor="#aaa" />

            <Text style={styles.label}>Меню</Text>
            {menuItems.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <TextInput style={[styles.input, { flex: 2, marginBottom: 0 }]} placeholder="Название" value={item.name} onChangeText={v => setMenuItems(prev => prev.map((m, j) => j === i ? { ...m, name: v } : m))} placeholderTextColor="#aaa" />
                <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Цена" value={item.price} onChangeText={v => setMenuItems(prev => prev.map((m, j) => j === i ? { ...m, price: v } : m))} keyboardType="numeric" placeholderTextColor="#aaa" />
                <TouchableOpacity onPress={() => setMenuItems(prev => prev.filter((_, j) => j !== i))} style={{ justifyContent: 'center', padding: 8 }}>
                  <Ionicons name="trash-outline" size={20} color="#f44336" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity onPress={() => setMenuItems(prev => [...prev, { name: '', price: '' }])} style={{ backgroundColor: '#FFF0EB', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: '#FF4500', fontWeight: '600' }}>+ Добавить позицию</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* ====== ТЕХНИКА ====== */}
      {cat === 'tech' && (
        <>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TouchableOpacity onPress={() => setIsNew(true)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: isNew ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: isNew ? '#fff' : '#555', fontWeight: '600' }}>✨ Новый</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsNew(false)} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: !isNew ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: !isNew ? '#fff' : '#555', fontWeight: '600' }}>♻️ Б/У</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Характеристики</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="RAM: 8GB, Экран: 6.5" value={specs} onChangeText={setSpecs} multiline placeholderTextColor="#aaa" />

            <Text style={styles.label}>Гарантия</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
              {GUARANTEE_OPTIONS.map(g => (
                <TouchableOpacity key={g} onPress={() => setGuarantee(g)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: guarantee === g ? '#FF4500' : '#f0f0f0' }}>
                  <Text style={{ color: guarantee === g ? '#fff' : '#555', fontWeight: '600' }}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Цвета</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {COLORS.slice(0, 6).map(color => (
                <TouchableOpacity
                  key={color}
                  onPress={() => {
                    if (techColors.find(v => v.color === color)) setTechColors(prev => prev.filter(v => v.color !== color));
                    else setTechColors(prev => [...prev, { color }]);
                  }}
                  style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: techColors.find(v => v.color === color) ? '#FF4500' : '#f0f0f0' }}
                >
                  <Text style={{ color: techColors.find(v => v.color === color) ? '#fff' : '#555', fontSize: 13 }}>{color}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {techColors.map(variant => (
              <View key={variant.color} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                <TouchableOpacity onPress={() => pickColorImage(variant.color, true)} style={{ width: 56, height: 56, borderRadius: 10, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: variant.imageUri ? '#FF4500' : '#ddd', overflow: 'hidden' }}>
                  {variant.imageUri ? <Image source={{ uri: variant.imageUri }} style={{ width: 56, height: 56 }} resizeMode="cover" /> : <Ionicons name="camera" size={20} color="#aaa" />}
                </TouchableOpacity>
                <Text style={{ fontWeight: 'bold', color: '#222' }}>{variant.color}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* ====== КОСМЕТИКА ====== */}
      {cat === 'beauty' && (
        <>
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 14 }}>
            <Text style={styles.label}>Объём/Вес</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="100" value={volume} onChangeText={setVolume} keyboardType="numeric" placeholderTextColor="#aaa" />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {VOLUME_UNITS.map(u => (
                  <TouchableOpacity key={u} onPress={() => setVolumeUnit(u)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: volumeUnit === u ? '#FF4500' : '#f0f0f0' }}>
                    <Text style={{ color: volumeUnit === u ? '#fff' : '#555', fontWeight: '600' }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Text style={styles.label}>Срок годности</Text>
            <TextInput style={styles.input} placeholder="12/2026" value={expiryDate} onChangeText={setExpiryDate} placeholderTextColor="#aaa" />

            <Text style={styles.label}>Состав</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Основные компоненты..." value={composition} onChangeText={setComposition} multiline placeholderTextColor="#aaa" />
          </View>
        </>
      )}

      {/* Кнопка */}
      {loading
        ? <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 16 }} />
        : <TouchableOpacity style={styles.bigBtn} onPress={handleSubmit}>
            <Text style={styles.bigBtnText}>🚀 Опубликовать скидку</Text>
          </TouchableOpacity>
      }

      <View style={{ height: 40 }} />

      <AddressPickerModal
        visible={showAddressPicker}
        onClose={() => setShowAddressPicker(false)}
        onSelect={(address, lat, lng) => {
          setExactAddress(address);
          setDealLat(lat);
          setDealLng(lng);
          setShowAddressPicker(false);
        }}
        city={city}
      />
    </ScrollView>
  );
}
