import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, Dimensions, Image, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    emoji: '🔥',
    title: 'Добро пожаловать\nв O-GO!',
    subtitle: 'Лучший агрегатор скидок\nКазахстана',
    description: 'Находи скидки до 90% в магазинах твоего города. Экономь каждый день!',
    color: '#FF4500',
    lightColor: '#FFF0EB',
  },
  {
    id: '2',
    emoji: '🛍',
    title: 'Тысячи скидок\nв одном месте',
    subtitle: 'Одежда, еда, техника, косметика',
    description: 'Все скидки от проверенных продавцов твоего города собраны в одном приложении.',
    color: '#6366F1',
    lightColor: '#EEF2FF',
  },
  {
    id: '3',
    emoji: '📍',
    title: 'Скидки рядом\nс тобой',
    subtitle: 'Карта магазинов со скидками',
    description: 'Смотри на карте где находятся магазины со скидками и прокладывай маршрут.',
    color: '#F59E0B',
    lightColor: '#FFFBEB',
  },
  {
    id: '4',
    emoji: '💰',
    title: 'Экономь\nкаждый день!',
    subtitle: 'Следи за своей экономией',
    description: 'Приложение считает сколько ты сэкономил. Начни экономить прямо сейчас!',
    color: '#22C55E',
    lightColor: '#F0FFF4',
  },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      await AsyncStorage.setItem('onboardingDone', 'true');
      onDone();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('onboardingDone', 'true');
    onDone();
  };

  const current = SLIDES[currentIndex];

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={{ width, flex: 1 }}>
            {/* Верхняя цветная часть */}
            <View style={{ backgroundColor: item.color, height: height * 0.52, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: 40, borderBottomRightRadius: 40 }}>
              {/* Декоративные круги */}
              <View style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <View style={{ position: 'absolute', bottom: 20, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.06)' }} />

              {/* Большой эмодзи */}
              <View style={{ width: 140, height: 140, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' }}>
                <Text style={{ fontSize: 72 }}>{item.emoji}</Text>
              </View>

              <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center', lineHeight: 36, paddingHorizontal: 24 }}>
                {item.title}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 }}>
                {item.subtitle}
              </Text>
            </View>

            {/* Нижняя белая часть */}
            <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 32, alignItems: 'center' }}>
              <Text style={{ color: '#555', fontSize: 16, textAlign: 'center', lineHeight: 24 }}>
                {item.description}
              </Text>
            </View>
          </View>
        )}
      />

      {/* Нижняя панель */}
      <View style={{ paddingHorizontal: 24, paddingBottom: 48, paddingTop: 16 }}>
        {/* Точки прогресса */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === currentIndex ? 28 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: i === currentIndex ? current.color : '#e0e0e0',
              }}
            />
          ))}
        </View>

        {/* Кнопки */}
        <TouchableOpacity
          onPress={handleNext}
          style={{ backgroundColor: current.color, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginBottom: 12, shadowColor: current.color, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}
        >
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}>
            {currentIndex === SLIDES.length - 1 ? '🚀 Начать экономить!' : 'Далее →'}
          </Text>
        </TouchableOpacity>

        {currentIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={handleSkip} style={{ alignItems: 'center', padding: 8 }}>
            <Text style={{ color: '#aaa', fontSize: 15 }}>Пропустить</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
