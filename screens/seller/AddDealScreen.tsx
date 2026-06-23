import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { User } from 'firebase/auth';
import * as ImagePicker from 'expo-image-picker';
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
const BEAUTY_TAGS = ['💆 Для лица', '💇 Для волос', '🧴 Для тела', '✨ Универсальный', '🌿 Гипоаллергенный'];
const GUARANTEE_OPTIONS = ['Без гарантии', '3 месяца', '6 месяцев', '1 год', '2 года'];
const VOLUME_UNITS = ['мл', 'л', 'г', 'кг'];

export function AddDealScreen({ user, sellerCategory }: { user: User, sellerCategory?: string }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [oldPrice, setOldPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [marketPrice, setMarketPrice] = useState('');
  const [store, setStore] = useState('');
  const [city, setCity] = useState('');
  const [hasDelivery, setHasDelivery] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  const [dealLat, setDealLat] = useState<number | null>(null);
const [dealLng, setDealLng] = useState<number | null>(null);
const [showAddressPicker, setShowAddressPicker] = useState(false);
const [exactAddress, setExactAddress] = useState('');

  // 👕 Одежда/Обувь
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [outOfStockSizes, setOutOfStockSizes] = useState<string[]>([]);
  const [useColors, setUseColors] = useState(false);
  const [colorVariants, setColorVariants] = useState<{ color: string, imageUri?: string, imageBase64?: string }[]>([]);
  const [clothingType, setClothingType] = useState<'clothing' | 'shoes'>('clothing');

  // 🍔 Еда
  const [foodTags, setFoodTags] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<{ name: string, price: string }[]>([]);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuPrice, setNewMenuPrice] = useState('');
  const [hasBooking, setHasBooking] = useState(false);
  const [tableCount, setTableCount] = useState('');
  const [workingHours, setWorkingHours] = useState('');
  const [weight, setWeight] = useState('');

  // �� Техника
  const [specs, setSpecs] = useState('');
  const [guarantee, setGuarantee] = useState('Без гарантии');
  const [isNew, setIsNew] = useState(true);
  const [techColors, setTechColors] = useState<{ color: string, imageUri?: string, imageBase64?: string }[]>([]);

  // 💄 Косметика
  const [volume, setVolume] = useState('');
  const [volumeUnit, setVolumeUnit] = useState('мл');
  const [expiryDate, setExpiryDate] = useState('');
  const [beautyTags, setBeautyTags] = useState<string[]>([]);
  const [composition, setComposition] = useState('');

  // 📦 Общее
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [depth, setDepth] = useState('');
  const [material, setMaterial] = useState('');
  const [stockCount, setStockCount] = useState('');

  const discount = oldPrice && newPrice ? Math.round((1 - Number(newPrice) / Number(oldPrice)) * 100) : 0;
  const cat = sellerCategory || 'general';

  const pickMainImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к фото');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const pickColorImage = async (color: string, istech = false) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.6 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>(resolve => { reader.onloadend = () => resolve(reader.result as string); reader.readAsDataURL(blob); });
      if (istech) setTechColors(prev => prev.map(v => v.color === color ? { ...v, imageUri: uri, imageBase64: base64 } : v));
      else setColorVariants(prev => prev.map(v => v.color === color ? { ...v, imageUri: uri, imageBase64: base64 } : v));
    }
  };

  const toggleSize = (size: string) => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  const toggleColor = (color: string, istech = false) => {
    if (istech) {
      if (techColors.find(v => v.color === color)) setTechColors(prev => prev.filter(v => v.color !== color));
      else setTechColors(prev => [...prev, { color }]);
    } else {
      if (colorVariants.find(v => v.color === color)) setColorVariants(prev => prev.filter(v => v.color !== color));
      else setColorVariants(prev => [...prev, { color }]);
    }
  };

  const addMenuItem = () => {
    if (!newMenuName || !newMenuPrice) return;
    setMenuItems(prev => [...prev, { name: newMenuName, price: newMenuPrice }]);
    setNewMenuName(''); setNewMenuPrice('');
  };

  const handleAdd = async () => {
    if (!title || !oldPrice || !newPrice || !store || !city) return Alert.alert('Ошибка', 'Заполни все поля');
    if (Number(newPrice) >= Number(oldPrice)) return Alert.alert('Ошибка', 'Новая цена должна быть меньше старой');
    setLoading(true);
    try {
      let imageUrl = null;
if (imageUri) {
  const response = await fetch(imageUri);
  const blob = await response.blob();
  const reader = new FileReader();
  imageUrl = await new Promise(resolve => {
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

      const baseData = {
        title, description, oldPrice: Number(oldPrice), newPrice: Number(newPrice),
        marketPrice: marketPrice ? Number(marketPrice) : null,
        discount, store, city, imageUrl, hasDelivery,
        category: cat, exactAddress,
        lat: dealLat,
        lng: dealLng,
        sellerId: user.uid, sellerEmail: user.email,
        createdAt: new Date().toISOString(),
      };

      const categoryData: any = {};
      if (cat === 'clothing') {
        categoryData.sizes = selectedSizes;
        categoryData.outOfStockSizes = outOfStockSizes;
        categoryData.colorVariants = useColors ? colorVariants.map(v => ({ color: v.color, image: v.imageUri || null })) : [];
        categoryData.colorVariants = techColors.map(v => ({ color: v.color, image: v.imageUri || null }));
        } else if (cat === 'food') {
        categoryData.foodTags = foodTags;
        categoryData.menuItems = menuItems;
        categoryData.hasBooking = hasBooking;
        categoryData.tableCount = hasBooking ? Number(tableCount) : null;
        categoryData.workingHours = workingHours;
        categoryData.weight = weight;
      } else if (cat === 'tech') {
        categoryData.specs = specs;
        categoryData.guarantee = guarantee;
        categoryData.isNew = isNew;
        categoryData.colorVariants = techColors.map(v => ({ color: v.color, image: v.imageBase64 || null }));
      } else if (cat === 'beauty') {
        categoryData.volume = volume;
        categoryData.volumeUnit = volumeUnit;
        categoryData.expiryDate = expiryDate;
        categoryData.beautyTags = beautyTags;
        categoryData.composition = composition;
      } else if (cat === 'general') {
        categoryData.width = width;
        categoryData.height = height;
        categoryData.depth = depth;
        categoryData.material = material;
        categoryData.stockCount = stockCount ? Number(stockCount) : null;
      }

      await addDoc(collection(db, 'deals'), { ...baseData, ...categoryData });
      Alert.alert('✅ Скидка добавлена!');
      setTitle(''); setDescription(''); setOldPrice(''); setNewPrice('');
      setMarketPrice(''); setStore(''); setCity(''); setImageUri(null);
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setLoading(false);
  };

  const categoryInfo: Record<string, { emoji: string, label: string, placeholder: string }> = {
    clothing: { emoji: '👕', label: 'Одежда и Обувь', placeholder: 'Nike Air Max 90' },
    food: { emoji: '🍔', label: 'Еда и рестораны', placeholder: 'Донер Классический с говядиной' },
    tech: { emoji: '💻', label: 'Техника и гаджеты', placeholder: 'Samsung Galaxy S24' },
    beauty: { emoji: '💄', label: 'Косметика', placeholder: 'Туалетная вода Dior Sauvage' },
    general: { emoji: '📦', label: 'Магазин', placeholder: 'Название товара' },
  };

  const info = categoryInfo[cat] || categoryInfo.general;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f5f5f5' }} contentContainerStyle={{ padding: 20 }}>

      {/* Заголовок с нишей */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <View style={{ backgroundColor: '#FF4500', borderRadius: 12, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 24 }}>{info.emoji}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222' }}>Добавить скидку</Text>
          <Text style={{ color: '#FF4500', fontSize: 13 }}>{info.label}</Text>
        </View>
      </View>

      {/* Фото */}
      <TouchableOpacity onPress={pickMainImage} style={styles.imagePicker}>
        {imageUri
          ? <Image source={{ uri: imageUri }} style={{ width: '100%', height: 180, borderRadius: 12 }} resizeMode="cover" />
          : <View style={{ alignItems: 'center' }}><Ionicons name="camera" size={40} color="#FF4500" /><Text style={{ color: '#FF4500', fontWeight: '600', marginTop: 8 }}>Добавить фото</Text></View>
        }
      </TouchableOpacity>

      {/* Общие поля */}
      <Text style={styles.label}>Название *</Text>
      <TextInput style={styles.input} placeholder={info.placeholder} value={title} onChangeText={setTitle} placeholderTextColor="#aaa" />

      <Text style={styles.label}>Описание</Text>
      <TextInput style={[styles.input, { height: 80 }]} placeholder="Подробное описание..." value={description} onChangeText={setDescription} multiline placeholderTextColor="#aaa" />

      <Text style={styles.label}>Старая цена (₸) *</Text>
      <TextInput style={styles.input} placeholder="45000" value={oldPrice} onChangeText={setOldPrice} keyboardType="numeric" placeholderTextColor="#aaa" />

      <Text style={styles.label}>Новая цена (₸) *</Text>
      <TextInput style={styles.input} placeholder="27000" value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" placeholderTextColor="#aaa" />

      {discount > 0 && (
        <View style={{ backgroundColor: '#FF4500', borderRadius: 10, padding: 10, marginBottom: 14, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Скидка: -{discount}% 🔥</Text>
        </View>
      )}

      <View style={{ backgroundColor: '#FFF9E6', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FFD700' }}>
        <Text style={{ fontWeight: 'bold', color: '#333', marginBottom: 6 }}>💡 Цена у конкурентов (₸)</Text>
        <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="65000" value={marketPrice} onChangeText={setMarketPrice} keyboardType="numeric" placeholderTextColor="#aaa" />
      </View>

      <Text style={styles.label}>Магазин / Заведение *</Text>
      <TextInput style={styles.input} placeholder="Название" value={store} onChangeText={setStore} placeholderTextColor="#aaa" />

      <Text style={styles.label}>Город *</Text>
      <TextInput style={styles.input} placeholder="Алматы" value={city} onChangeText={setCity} placeholderTextColor="#aaa" />
      {/* Точный адрес */}
<Text style={styles.label}>📍 Точный адрес магазина</Text>
{exactAddress ? (
  <View style={{ backgroundColor: '#E8F5E9', borderRadius: 12, padding: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
    <View style={{ flex: 1 }}>
      <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 13 }} numberOfLines={2}>{exactAddress}</Text>
      {dealLat && <Text style={{ color: '#999', fontSize: 11, marginTop: 2 }}>📌 {dealLat.toFixed(4)}, {dealLng?.toFixed(4)}</Text>}
    </View>
    <TouchableOpacity onPress={() => setShowAddressPicker(true)} style={{ marginLeft: 10 }}>
      <Text style={{ color: '#FF4500', fontSize: 13 }}>Изменить</Text>
    </TouchableOpacity>
  </View>
) : (
  <TouchableOpacity
    onPress={() => { if (!city) return Alert.alert('Сначала выбери город'); setShowAddressPicker(true); }}
    style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
  >
    <Ionicons name="location" size={20} color="#FF4500" />
    <Text style={{ color: '#FF4500', fontWeight: '600' }}>Указать точный адрес на карте</Text>
  </TouchableOpacity>
)}

<AddressPickerModal
  visible={showAddressPicker}
  city={city || 'Алматы'}
  onConfirm={(address, lat, lng) => {
    setExactAddress(address);
    setDealLat(lat);
    setDealLng(lng);
  }}
  onClose={() => setShowAddressPicker(false)}
/>

      {/* ====== 👕 ОДЕЖДА/ОБУВЬ ====== */}
      {cat === 'clothing' && (
        <>
          {/* Тип */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 10 }}>Тип товара</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setClothingType('clothing')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: clothingType === 'clothing' ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: clothingType === 'clothing' ? '#fff' : '#333', fontWeight: '600' }}>👕 Одежда</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setClothingType('shoes')} style={{ flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: clothingType === 'shoes' ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: clothingType === 'shoes' ? '#fff' : '#333', fontWeight: '600' }}>👟 Обувь</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Размеры */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 10 }}>📏 Доступные размеры</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(clothingType === 'clothing' ? SIZES_CLOTHING : SIZES_SHOES).map(size => {
                const sel = selectedSizes.includes(size);
                const oos = outOfStockSizes.includes(size);
                return (
                  <TouchableOpacity key={size}
                    onPress={() => toggleSize(size)}
                    onLongPress={() => sel && setOutOfStockSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])}
                    style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: sel ? (oos ? '#999' : '#FF4500') : '#f0f0f0' }}
                  >
                    <Text style={{ color: sel ? '#fff' : '#666', fontWeight: '600' }}>{size}{oos ? ' ✗' : ''}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {selectedSizes.length > 0 && <Text style={{ color: '#aaa', fontSize: 11, marginTop: 8 }}>💡 Зажми размер → пометить "нет в наличии"</Text>}
          </View>

          {/* Цвета */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15 }}>🎨 Цвета с фото</Text>
              <Switch value={useColors} onValueChange={setUseColors} trackColor={{ false: '#ddd', true: '#FF4500' }} thumbColor="#fff" />
            </View>
            {useColors && (
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {COLORS.map(color => (
                    <TouchableOpacity key={color} onPress={() => toggleColor(color)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: colorVariants.find(v => v.color === color) ? '#FF4500' : '#f0f0f0' }}>
                      <Text style={{ color: colorVariants.find(v => v.color === color) ? '#fff' : '#666', fontWeight: '600' }}>{color}</Text>
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

      {/* ====== 🍔 ЕДА ====== */}
      {cat === 'food' && (
        <>
          <Text style={styles.label}>Вес/Объём блюда</Text>
          <TextInput style={styles.input} placeholder="350г / 500мл" value={weight} onChangeText={setWeight} placeholderTextColor="#aaa" />

          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 10 }}>🏷 Особые отметки</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {FOOD_TAGS.map(tag => (
                <TouchableOpacity key={tag} onPress={() => setFoodTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: foodTags.includes(tag) ? '#FF4500' : '#f0f0f0' }}>
                  <Text style={{ color: foodTags.includes(tag) ? '#fff' : '#333', fontWeight: '600', fontSize: 13 }}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 4 }}>📋 Меню заведения</Text>
            <Text style={{ color: '#999', fontSize: 12, marginBottom: 10 }}>Добавь блюда — покупатель увидит весь ассортимент</Text>
            {menuItems.map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' }}>
                <Text style={{ color: '#222', flex: 1 }}>{item.name}</Text>
                <Text style={{ color: '#FF4500', fontWeight: 'bold', marginRight: 10 }}>{Number(item.price).toLocaleString()} ₸</Text>
                <TouchableOpacity onPress={() => setMenuItems(prev => prev.filter((_, idx) => idx !== i))}><Ionicons name="close-circle" size={20} color="#FF4500" /></TouchableOpacity>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TextInput style={[styles.input, { flex: 2, marginBottom: 0 }]} placeholder="Название блюда" value={newMenuName} onChangeText={setNewMenuName} placeholderTextColor="#aaa" />
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="Цена" value={newMenuPrice} onChangeText={setNewMenuPrice} keyboardType="numeric" placeholderTextColor="#aaa" />
              <TouchableOpacity onPress={addMenuItem} style={{ backgroundColor: '#FF4500', borderRadius: 12, width: 44, height: 48, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15 }}>🗓 Бронирование столиков</Text>
              <Switch value={hasBooking} onValueChange={setHasBooking} trackColor={{ false: '#ddd', true: '#FF4500' }} thumbColor="#fff" />
            </View>
            {hasBooking && (
              <>
                <TextInput style={styles.input} placeholder="Кол-во столиков (10)" value={tableCount} onChangeText={setTableCount} keyboardType="numeric" placeholderTextColor="#aaa" />
                <TextInput style={styles.input} placeholder="Часы работы (10:00 - 22:00)" value={workingHours} onChangeText={setWorkingHours} placeholderTextColor="#aaa" />
              </>
            )}
          </View>
        </>
      )}

      {/* ====== 💻 ТЕХНИКА ====== */}
      {cat === 'tech' && (
        <>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 10 }}>📊 Состояние товара</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setIsNew(true)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: isNew ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: isNew ? '#fff' : '#333', fontWeight: '600' }}>✨ Новый</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsNew(false)} style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: !isNew ? '#FF4500' : '#f0f0f0', alignItems: 'center' }}>
                <Text style={{ color: !isNew ? '#fff' : '#333', fontWeight: '600' }}>🔄 Б/У</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 10 }}>🛡 Гарантия</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {GUARANTEE_OPTIONS.map(g => (
                <TouchableOpacity key={g} onPress={() => setGuarantee(g)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, backgroundColor: guarantee === g ? '#FF4500' : '#f0f0f0' }}>
                  <Text style={{ color: guarantee === g ? '#fff' : '#333', fontWeight: '600' }}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.label}>⚙️ Характеристики</Text>
          <TextInput style={[styles.input, { height: 100 }]} placeholder={'Память: 256 ГБ\nОЗУ: 8 ГБ\nКамера: 50 МП'} value={specs} onChangeText={setSpecs} multiline placeholderTextColor="#aaa" />

          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 8 }}>🎨 Цвета</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
              {COLORS.map(color => (
                <TouchableOpacity key={color} onPress={() => toggleColor(color, true)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: techColors.find(v => v.color === color) ? '#FF4500' : '#f0f0f0' }}>
                  <Text style={{ color: techColors.find(v => v.color === color) ? '#fff' : '#666', fontWeight: '600' }}>{color}</Text>
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

      {/* ====== 💄 КОСМЕТИКА ====== */}
      {cat === 'beauty' && (
        <>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 10 }}>📦 Объём / Вес</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput style={[styles.input, { flex: 1, marginBottom: 0 }]} placeholder="100" value={volume} onChangeText={setVolume} keyboardType="numeric" placeholderTextColor="#aaa" />
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {VOLUME_UNITS.map(u => (
                  <TouchableOpacity key={u} onPress={() => setVolumeUnit(u)} style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: volumeUnit === u ? '#FF4500' : '#f0f0f0', justifyContent: 'center' }}>
                    <Text style={{ color: volumeUnit === u ? '#fff' : '#333', fontWeight: '600' }}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <Text style={styles.label}>📅 Срок годности *</Text>
          <TextInput style={styles.input} placeholder="12/2026" value={expiryDate} onChangeText={setExpiryDate} placeholderTextColor="#aaa" />

          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 10 }}>🏷 Теги</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {BEAUTY_TAGS.map(tag => (
                <TouchableOpacity key={tag} onPress={() => setBeautyTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])} style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: beautyTags.includes(tag) ? '#FF4500' : '#f0f0f0' }}>
                  <Text style={{ color: beautyTags.includes(tag) ? '#fff' : '#333', fontWeight: '600', fontSize: 13 }}>{tag}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Text style={styles.label}>🧪 Состав</Text>
          <TextInput style={[styles.input, { height: 80 }]} placeholder="Aqua, Glycerin, Niacinamide..." value={composition} onChangeText={setComposition} multiline placeholderTextColor="#aaa" />
        </>
      )}

      {/* ====== 📦 ОБЩЕЕ ====== */}
      {cat === 'general' && (
        <>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15, marginBottom: 10 }}>📐 Габариты (см)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>Ширина</Text>
                <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="30" value={width} onChangeText={setWidth} keyboardType="numeric" placeholderTextColor="#aaa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>Высота</Text>
                <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="40" value={height} onChangeText={setHeight} keyboardType="numeric" placeholderTextColor="#aaa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#999', fontSize: 12, marginBottom: 4 }}>Глубина</Text>
                <TextInput style={[styles.input, { marginBottom: 0 }]} placeholder="20" value={depth} onChangeText={setDepth} keyboardType="numeric" placeholderTextColor="#aaa" />
              </View>
            </View>
          </View>

          <Text style={styles.label}>🪵 Материал</Text>
          <TextInput style={styles.input} placeholder="Дерево, Керамика, Нержавеющая сталь..." value={material} onChangeText={setMaterial} placeholderTextColor="#aaa" />

          <Text style={styles.label}>📦 Количество в наличии</Text>
          <TextInput style={styles.input} placeholder="50" value={stockCount} onChangeText={setStockCount} keyboardType="numeric" placeholderTextColor="#aaa" />
        </>
      )}

      {/* Доставка */}
      <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 15 }}>🚚 Есть доставка</Text>
          <Text style={{ color: '#999', fontSize: 13 }}>Заказы онлайн</Text>
        </View>
        <Switch value={hasDelivery} onValueChange={setHasDelivery} trackColor={{ false: '#ddd', true: '#FF4500' }} thumbColor="#fff" />
      </View>

      {loading
        ? <ActivityIndicator size="large" color="#FF4500" />
        : <TouchableOpacity style={styles.bigBtn} onPress={handleAdd}>
            <Text style={styles.bigBtnText}>Опубликовать скидку 🚀</Text>
          </TouchableOpacity>
      }
    </ScrollView>
  );
}
