import { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Image, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { User } from 'firebase/auth';
import { StarRating } from './StarRating';
import { styles } from './styles';
import * as ImagePicker from 'expo-image-picker';

export function ReviewModal({ deal, user, visible, onClose }: { deal: any, user: User | null, visible: boolean, onClose: () => void }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [myPhotos, setMyPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!deal) return;
    const q = query(collection(db, 'deals', deal.id, 'reviews'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [deal]);

  const pickPhoto = async () => {
    if (myPhotos.length >= 3) return Alert.alert('Максимум 3 фото');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к фото');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      // Конвертируем в base64
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      setMyPhotos(prev => [...prev, base64]);
    }
  };

  const takePhoto = async () => {
    if (myPhotos.length >= 3) return Alert.alert('Максимум 3 фото');
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Нет доступа к камере');
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const response = await fetch(uri);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>(resolve => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      setMyPhotos(prev => [...prev, base64]);
    }
  };

  const removePhoto = (index: number) => {
    setMyPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const submitReview = async () => {
    if (!user) return Alert.alert('Войдите', 'Чтобы оставить отзыв');
    if (myRating === 0) return Alert.alert('Ошибка', 'Поставьте оценку');
    setLoading(true);
    try {
      await addDoc(collection(db, 'deals', deal.id, 'reviews'), {
        userId: user.uid,
        userEmail: user.email,
        rating: myRating,
        comment: myComment,
        photos: myPhotos,
        createdAt: new Date().toISOString(),
      });
      setMyRating(0);
      setMyComment('');
      setMyPhotos([]);
      Alert.alert('✅ Отзыв добавлен!', 'Спасибо за ваш отзыв!');
    } catch (e: any) { Alert.alert('Ошибка', e.message); }
    setLoading(false);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : '0';

  // Распределение оценок
  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percent: reviews.length > 0 ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100 : 0,
  }));

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
        {/* Шапка */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FF4500' }}>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>⭐ Отзывы</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>

          {/* Общий рейтинг */}
          <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 52, fontWeight: 'bold', color: '#FF4500' }}>{avgRating}</Text>
                <StarRating rating={Math.round(Number(avgRating))} size={20} />
                <Text style={{ color: '#999', fontSize: 12, marginTop: 4 }}>{reviews.length} отзывов</Text>
              </View>
              <View style={{ flex: 1 }}>
                {ratingCounts.map(({ star, count, percent }) => (
                  <View key={star} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ color: '#666', fontSize: 12, width: 8 }}>{star}</Text>
                    <Ionicons name="star" size={12} color="#FF4500" />
                    <View style={{ flex: 1, height: 6, backgroundColor: '#f0f0f0', borderRadius: 3 }}>
                      <View style={{ width: `${percent}%`, height: 6, backgroundColor: '#FF4500', borderRadius: 3 }} />
                    </View>
                    <Text style={{ color: '#999', fontSize: 12, width: 16 }}>{count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Форма отзыва */}
          {user && (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <Text style={{ fontWeight: 'bold', color: '#222', marginBottom: 12, fontSize: 16 }}>
                ✍️ Ваш отзыв
              </Text>

              {/* Звёзды */}
              <Text style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>Оценка:</Text>
              <View style={{ marginBottom: 14 }}>
                <StarRating rating={myRating} onRate={setMyRating} size={36} />
                {myRating > 0 && (
                  <Text style={{ color: '#FF4500', marginTop: 6, fontSize: 13 }}>
                    {['', '😞 Плохо', '😕 Не очень', '😐 Нормально', '😊 Хорошо', '🤩 Отлично!'][myRating]}
                  </Text>
                )}
              </View>

              {/* Текст */}
              <Text style={{ color: '#666', fontSize: 14, marginBottom: 6 }}>Комментарий:</Text>
              <TextInput
                style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Расскажите о своём опыте покупки..."
                value={myComment}
                onChangeText={setMyComment}
                multiline
                numberOfLines={4}
                placeholderTextColor="#aaa"
              />

              {/* Фото */}
              <Text style={{ color: '#666', fontSize: 14, marginBottom: 8 }}>
                Фото товара ({myPhotos.length}/3):
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                {myPhotos.map((photo, i) => (
                  <View key={i} style={{ position: 'relative' }}>
                    <Image source={{ uri: photo }} style={{ width: 80, height: 80, borderRadius: 10 }} />
                    <TouchableOpacity
                      onPress={() => removePhoto(i)}
                      style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#FF4500', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
                {myPhotos.length < 3 && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                      onPress={pickPhoto}
                      style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons name="image" size={24} color="#FF4500" />
                      <Text style={{ color: '#FF4500', fontSize: 10, marginTop: 2 }}>Галерея</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={takePhoto}
                      style={{ width: 80, height: 80, borderRadius: 10, backgroundColor: '#f5f5f5', borderWidth: 2, borderColor: '#FF4500', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }}
                    >
                      <Ionicons name="camera" size={24} color="#FF4500" />
                      <Text style={{ color: '#FF4500', fontSize: 10, marginTop: 2 }}>Камера</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {loading
                ? <ActivityIndicator color="#FF4500" size="large" />
                : (
                  <TouchableOpacity style={styles.bigBtn} onPress={submitReview}>
                    <Text style={styles.bigBtnText}>
                      {myPhotos.length > 0 ? `Отправить с ${myPhotos.length} фото 📸` : 'Отправить отзыв ⭐'}
                    </Text>
                  </TouchableOpacity>
                )
              }
            </View>
          )}

          {/* Список отзывов */}
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#222', marginBottom: 12 }}>
            Все отзывы ({reviews.length})
          </Text>

          {reviews.length === 0 ? (
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📝</Text>
              <Text style={{ color: '#aaa', textAlign: 'center' }}>
                Пока нет отзывов{'\n'}Будь первым!
              </Text>
            </View>
          ) : (
            reviews.map(review => (
              <View key={review.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 }}>
                {/* Шапка отзыва */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF0EB', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 16 }}>👤</Text>
                    </View>
                    <View>
                      <Text style={{ fontWeight: 'bold', color: '#222', fontSize: 14 }}>
                        {review.userEmail?.split('@')[0]}
                      </Text>
                      <Text style={{ color: '#aaa', fontSize: 11 }}>
                        {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                      </Text>
                    </View>
                  </View>
                  <StarRating rating={review.rating} size={14} />
                </View>

                {/* Текст отзыва */}
                {review.comment ? (
                  <Text style={{ color: '#333', fontSize: 15, lineHeight: 22, marginBottom: 10 }}>
                    {review.comment}
                  </Text>
                ) : null}

                {/* Фото отзыва */}
                {review.photos && review.photos.length > 0 && (
                  <View>
                    <Text style={{ color: '#999', fontSize: 12, marginBottom: 6 }}>
                      📸 Фото покупателя:
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {review.photos.map((photo: string, i: number) => (
                        <Image
                          key={i}
                          source={{ uri: photo }}
                          style={{ width: 90, height: 90, borderRadius: 10 }}
                          resizeMode="cover"
                        />
                      ))}
                    </View>
                  </View>
                )}

                {/* Эмодзи оценки */}
                <View style={{ marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#f5f5f5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                  <Text style={{ fontSize: 13 }}>
                    {['', '😞 Плохо', '😕 Не очень', '😐 Нормально', '😊 Хорошо', '🤩 Отлично!'][review.rating]}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
