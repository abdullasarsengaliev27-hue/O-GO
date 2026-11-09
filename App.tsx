import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotifications } from './notifications';

import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { MapScreen } from './screens/MapScreen';
import { FavoritesScreen } from './screens/FavoritesScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CitySelectScreen } from './screens/CitySelectScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { AIScreen } from './screens/AIScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState('');
  const [userCity, setUserCity] = useState<string | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [initLoaded, setInitLoaded] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const city = await AsyncStorage.getItem('selectedCity');
        setUserCity(city);
        const onboarding = await AsyncStorage.getItem('onboardingDone');
        setOnboardingDone(onboarding === 'true');
      } catch {}
      setInitLoaded(true);
    };
    init();
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const adminSnap = await getDoc(doc(db, 'admins', u.uid));
          if (adminSnap.exists() && adminSnap.data().role === 'admin') {
            setUserRole('admin');
            setAppReady(true);
            return;
          }
          const snap = await getDoc(doc(db, 'users', u.uid));
          setUserRole(snap.exists() ? (snap.data().role || 'buyer') : 'buyer');
        } catch {
          setUserRole('buyer');
        }
        registerForPushNotifications(u.uid).catch(() => {});
      } else {
        setUserRole('');
      }
      setAppReady(true);
    });
  }, []);

  const handleCitySelect = async (city: string) => {
    try { await AsyncStorage.setItem('selectedCity', city); } catch {}
    setUserCity(city);
  };

  // Загрузка
  if (!appReady || !initLoaded) return (
    <View style={{ flex: 1, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' }}>
      <Image
        source={require('./assets/icon.png')}
        style={{ width: 140, height: 140, borderRadius: 36, marginBottom: 24 }}
        resizeMode="cover"
      />
      <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.85)', marginBottom: 60 }}>Все скидки в одном месте</Text>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, position: 'absolute', bottom: 40 }}>Казахстан 🇰🇿</Text>
    </View>
  );

  if (user && userRole === '') return (
    <View style={{ flex: 1, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#fff" />
      <Text style={{ color: '#fff', marginTop: 16, fontSize: 14 }}>Загрузка профиля...</Text>
    </View>
  );

  // 1. Онбординг (первый запуск)
  if (!onboardingDone) return (
    <OnboardingScreen onDone={() => setOnboardingDone(true)} />
  );

  // 2. Выбор города
  if (!userCity) return (
    <CitySelectScreen onSelect={handleCitySelect} />
  );

  // 3. Приложение
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#f0f0f0', height: 60, paddingBottom: 8 },
          tabBarActiveTintColor: '#FF4500',
          tabBarInactiveTintColor: '#999',
          tabBarIcon: ({ focused, color, size }) => {
            const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
              'Главная': focused ? 'home' : 'home-outline',
              'Поиск': focused ? 'search' : 'search-outline',
              'Карта': focused ? 'map' : 'map-outline',
              'AI': focused ? 'sparkles' : 'sparkles-outline',
              'Избранное': focused ? 'heart' : 'heart-outline',
              'Профиль': focused ? 'person' : 'person-outline',
            };
            return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Главная">{() => <HomeScreen user={user} userCity={userCity} userRole={userRole} />}</Tab.Screen>
        <Tab.Screen name="Поиск">{() => <SearchScreen user={user} userCity={userCity} />}</Tab.Screen>
        <Tab.Screen name="Карта">{() => <MapScreen user={user} userCity={userCity} />}</Tab.Screen>
        <Tab.Screen name="AI">{() => <AIScreen user={user} userCity={userCity} />}</Tab.Screen>
        {userRole !== 'seller' && userRole !== 'admin' && (
          <Tab.Screen name="Избранное">{() => <FavoritesScreen user={user} />}</Tab.Screen>
        )}
        <Tab.Screen name="Профиль">
          {() => (
            <ProfileScreen
              user={user}
              userRole={userRole}
              userCity={userCity}
              onCityChange={setUserCity}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
